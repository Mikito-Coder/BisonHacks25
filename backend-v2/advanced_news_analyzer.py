import requests
import feedparser
import json
import os
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import openai
from datetime import datetime, timedelta
import networkx as nx
from sklearn.cluster import DBSCAN
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import logging
from news_analyzer import DCNewsAnalyzer  # Import the base class
from pydantic import BaseModel
from openai import OpenAI
from tqdm import tqdm
import asyncio
# from sentiment_analyzer import analyze_sentiment  # You'd need to create this
# from fake_news_detector import check_credibility  # You'd need to create this

@dataclass
class Article:
    title: str
    content: str
    url: str
    source: str
    published_date: Optional[datetime]
    author: Optional[str]
    category: Optional[str]
    summary: Optional[str]
    sentiment: Optional[Dict] = None
    credibility_score: Optional[float] = None
    embedding: Optional[List[float]] = None
    related_articles: Optional[List[str]] = None
    topics: Optional[List[str]] = None

class ArticleMetadata(BaseModel):
    title: str
    url: str
    source: str
    summary: str
    sentiment: str
    credibility_score: float
    topics: List[str]
    key_points: List[str]
    related_articles: List[str]
    cluster_id: int = 0

class NewsKnowledgeGraph:
    def __init__(self, openai_api_key: str = None):
        self.client = OpenAI(api_key=openai_api_key)
        self.articles_metadata: Dict[str, ArticleMetadata] = {}
        self.embeddings: Dict[str, List[float]] = {}
        self.knowledge_graph = nx.Graph()

    async def analyze_article(self, article: Dict[str, Any]) -> Tuple[str, Dict[str, Any], List[float]]:
        """Analyze a single article using OpenAI API."""
        try:
            if not article.get('title') or not article.get('source'):
                logging.error("Missing required article fields")
                return article.get('url', ''), None, None

            # Generate embedding
            try:
                response = self.client.embeddings.create(
                    model="text-embedding-3-small",
                    input=f"{article['title']} {article.get('summary', '')}",
                    encoding_format="float"
                )
                embedding = response.data[0].embedding
            except Exception as e:
                logging.error(f"Error generating embedding for {article['title']}: {e}")
                return article.get('url', ''), None, None

            # Analyze article content
            try:
                analysis_prompt = f"""Analyze this news article and provide a JSON response with the following structure:
                {{
                    "title": "{article['title']}",
                    "source": "{article['source']}",
                    "summary": "2-3 sentence summary",
                    "sentiment": "positive/negative/neutral",
                    "credibility_score": 50,
                    "topics": ["topic1", "topic2", "topic3"],
                    "key_points": ["point1", "point2", "point3"]
                }}"""

                completion = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",  # Changed to more reliable model for JSON
                    messages=[
                        {"role": "system", "content": "You are a news analyst. Provide structured analysis of news articles in JSON format."},
                        {"role": "user", "content": analysis_prompt}
                    ]
                )
                
                # Fixed: Correct way to access message content in new OpenAI client
                analysis = json.loads(completion.choices[0].message.content)
                
                # Validate required fields
                required_fields = ['title', 'source', 'summary', 'sentiment', 'credibility_score', 'topics', 'key_points']
                if not all(field in analysis for field in required_fields):
                    raise ValueError("Missing required fields in analysis")
                    
                # Ensure credibility_score is numeric
                analysis['credibility_score'] = float(analysis['credibility_score'])
                
                logging.info(f"Successfully analyzed article: {article['title']}")
                return article['url'], analysis, embedding

            except json.JSONDecodeError as e:
                logging.error(f"JSON parsing error for {article['title']}: {str(e)}")
                logging.error(f"Raw response: {completion.choices[0].message.content}")
                return article['url'], None, None
            except Exception as e:
                logging.error(f"Error analyzing article {article['title']}: {str(e)}")
                return article['url'], None, None

        except Exception as e:
            logging.error(f"Error processing article {article['title']}: {str(e)}")
            return article['url'], None, None

    async def process_articles(self, articles: List[Dict[str, Any]]):
        """Process all articles in parallel batches."""
        if not articles:
            logging.warning("No articles provided for processing")
            return

        logging.info(f"Starting to process {len(articles)} articles...")
        
        # Process in batches to respect API rate limits
        batch_size = 5
        results = []
        
        for i in range(0, len(articles), batch_size):
            batch = articles[i:i + batch_size]
            logging.info(f"Processing batch {i//batch_size + 1} of {(len(articles) + batch_size - 1)//batch_size}")
            batch_tasks = [self.analyze_article(article) for article in batch]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Handle any exceptions from the batch
            for result in batch_results:
                if isinstance(result, Exception):
                    logging.error(f"Batch processing error: {str(result)}")
                    continue
                if result[1] and result[2]:  # Only add successful results
                    results.append(result)
            
            await asyncio.sleep(1)  # Rate limiting
        
        # Process results
        successful_articles = 0
        for url, analysis, embedding in results:
            try:
                if analysis and embedding:
                    self.embeddings[url] = embedding
                    self.articles_metadata[url] = ArticleMetadata(
                        title=analysis['title'],
                        url=url,
                        source=analysis['source'],
                        summary=analysis['summary'],
                        sentiment=analysis['sentiment'],
                        credibility_score=float(analysis['credibility_score']),
                        topics=analysis['topics'],
                        key_points=analysis['key_points'],
                        related_articles=[]
                    )
                    successful_articles += 1
            except Exception as e:
                logging.error(f"Error processing results for {url}: {str(e)}")
                continue
        
        logging.info(f"Successfully processed {successful_articles} out of {len(articles)} articles")

    def cluster_articles(self, eps=0.3, min_samples=2):
        """Cluster articles based on embeddings."""
        if not self.embeddings:
            return

        urls = list(self.embeddings.keys())
        X = np.array([self.embeddings[url] for url in urls])
        
        clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(X)
        
        for url, cluster_id in zip(urls, clustering.labels_):
            if url in self.articles_metadata:
                self.articles_metadata[url].cluster_id = int(cluster_id)

    def build_knowledge_graph(self):
        """Build knowledge graph based on shared topics and clusters."""
        for url, metadata in self.articles_metadata.items():
            self.knowledge_graph.add_node(url, 
                                        type='article',
                                        cluster=metadata.cluster_id,
                                        topics=metadata.topics)
            
            # Add topics as nodes and connect to articles
            for topic in metadata.topics:
                if not self.knowledge_graph.has_node(topic):
                    self.knowledge_graph.add_node(topic, type='topic')
                self.knowledge_graph.add_edge(url, topic)
            
            # Connect articles in same cluster
            for other_url, other_metadata in self.articles_metadata.items():
                if (url != other_url and 
                    metadata.cluster_id == other_metadata.cluster_id and 
                    metadata.cluster_id != -1):
                    self.knowledge_graph.add_edge(url, other_url)

    def save_to_json(self, output_file: str = 'enhanced_news_results.json'):
        """Save the knowledge graph and metadata to JSON."""
        output = {
            'articles': [metadata.dict() for metadata in self.articles_metadata.values()],
            'knowledge_graph': {
                'nodes': [[n, dict(self.knowledge_graph.nodes[n])] for n in self.knowledge_graph.nodes()],
                'edges': list(self.knowledge_graph.edges())
            },
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'total_articles': len(self.articles_metadata),
                'sources': list(set(m.source for m in self.articles_metadata.values()))
            }
        }
        
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)

class EnhancedNewsAnalyzer(DCNewsAnalyzer):
    def __init__(self, channels, openai_api_key=None):
        super().__init__(channels)
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.knowledge_graph = nx.Graph()
        self.setup_logging()
        
    def setup_logging(self):
        logging.basicConfig(
            filename='news_analyzer.log',
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    async def extract_full_content(self, url: str) -> str:
        """Extract full article content using advanced parsing."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove unwanted elements
            for elem in soup.find_all(['script', 'style', 'nav', 'header', 'footer', 'ads']):
                elem.decompose()
            
            # Find main content (customize selectors based on news sites)
            content_selectors = [
                'article', '.article-content', '.story-content',
                '[data-testid="article-body"]'
            ]
            
            for selector in content_selectors:
                if content := soup.select_one(selector):
                    return content.get_text(strip=True)
            
            return ""
            
        except Exception as e:
            logging.error(f"Error extracting content from {url}: {e}")
            return ""

    async def analyze_article(self, article: Article) -> Article:
        """Comprehensive article analysis."""
        try:
            # Generate embedding for similarity comparison
            article.embedding = await self.generate_embedding(article.content)
            
            # Analyze sentiment
            article.sentiment = analyze_sentiment(article.content)
            
            # Check credibility
            article.credibility_score = check_credibility(article.content, article.source)
            
            # Extract topics using OpenAI
            article.topics = await self.extract_topics(article.content)
            
            return article
            
        except Exception as e:
            logging.error(f"Error analyzing article {article.title}: {e}")
            return article

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using OpenAI."""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text,
                encoding_format="float"
            )
            return response['data'][0]['embedding']
        except Exception as e:
            logging.error(f"Error generating embedding: {e}")
            return []

    async def extract_topics(self, content: str) -> List[str]:
        """Extract main topics using OpenAI."""
        try:
            prompt = f"Extract 5 main topics from this news article as a comma-separated list:\n\n{content[:2000]}"
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            topics = response['choices'][0]['message']['content'].split(',')
            return [topic.strip() for topic in topics]
        except Exception as e:
            logging.error(f"Error extracting topics: {e}")
            return []

    def find_related_articles(self, articles):
        # First, ensure we have articles to process
        if not articles:
            logging.warning("No articles provided for clustering")
            return []

        # Create embeddings
        embeddings = []
        valid_articles = []
        
        for article in articles:
            try:
                # Assuming you have a method to create embeddings
                embedding = self.create_embedding(article['title'] + ' ' + article.get('summary', ''))
                if embedding is not None:  # Check if embedding was created successfully
                    embeddings.append(embedding)
                    valid_articles.append(article)
            except Exception as e:
                logging.error(f"Error creating embedding for article: {str(e)}")
                continue

        # Check if we have enough articles for clustering
        if len(embeddings) < 2:
            logging.warning("Not enough articles for clustering (minimum 2 required)")
            return []

        # Convert to numpy array and reshape if necessary
        embeddings = np.array(embeddings)
        
        # Ensure we have a 2D array
        if len(embeddings.shape) == 1:
            embeddings = embeddings.reshape(-1, 1)

        # Perform clustering
        try:
            clustering = DBSCAN(eps=0.3, min_samples=2).fit(embeddings)
            # Process clustering results...
            return clustering.labels_
        except Exception as e:
            logging.error(f"Clustering failed: {str(e)}")
            return []

    def build_knowledge_graph(self, articles: List[Article]):
        """Build a knowledge graph connecting articles, topics, and sources."""
        for article in articles:
            # Add article node
            self.knowledge_graph.add_node(
                article.url,
                type='article',
                title=article.title,
                source=article.source
            )
            
            # Add and connect topics
            for topic in article.topics or []:
                self.knowledge_graph.add_node(
                    topic,
                    type='topic'
                )
                self.knowledge_graph.add_edge(article.url, topic)
            
            # Connect related articles
            for related_url in article.related_articles or []:
                self.knowledge_graph.add_edge(article.url, related_url)

    async def run_enhanced_analysis(self):
        """Run the enhanced analysis pipeline."""
        try:
            # Get basic results using parent class
            basic_results = await super().run_analysis()
            
            # Convert to Article objects and enhance
            articles = []
            for source, source_articles in basic_results.items():
                for article_data in source_articles:
                    article = Article(
                        title=article_data['title'],
                        content=await self.extract_full_content(article_data['link']),
                        url=article_data['link'],
                        source=source,
                        published_date=article_data.get('published'),
                        summary=article_data.get('generated_summary'),
                        author=None,
                        category=None
                    )
                    
                    # Perform comprehensive analysis
                    article = await self.analyze_article(article)
                    articles.append(article)
            
            # Find related articles
            self.find_related_articles(articles)
            
            # Build knowledge graph
            self.build_knowledge_graph(articles)
            
            # Save enhanced results
            self.save_results(articles)
            
            return articles
            
        except Exception as e:
            logging.error(f"Error in enhanced analysis: {e}")
            raise

    def save_results(self, articles: List[Article]):
        """Save enhanced results and knowledge graph."""
        # Save articles
        results = {
            "articles": [
                {
                    "title": article.title,
                    "url": article.url,
                    "source": article.source,
                    "summary": article.summary,
                    "sentiment": article.sentiment,
                    "credibility_score": article.credibility_score,
                    "topics": article.topics,
                    "related_articles": article.related_articles
                }
                for article in articles
            ],
            "knowledge_graph": {
                "nodes": [[n, data] for n, data in self.knowledge_graph.nodes(data=True)],
                "edges": list(self.knowledge_graph.edges())
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "total_articles": len(articles),
                "sources": list(set(a.source for a in articles))
            }
        }
        
        with open("enhanced_news_results.json", "w") as f:
            json.dump(results, f, indent=2)

# Define news sources to collect from
channels = {
    "NBC4 Washington (WRC-TV)": {
        "rss_url": "https://www.nbcwashington.com/news/local/?rss=y"
    },
    "FOX 5 DC (WTTG)": {
        "rss_url": "https://www.fox5dc.com/feeds/rss/news/local"
    },
    "WUSA9 (CBS)": {
        "rss_url": "https://www.wusa9.com/feeds/syndication/rss/local"
    },
    "ABC7 (WJLA-TV)": {
        "scrape_url": "https://wjla.com/news/local",
        "css_selectors": {"headline": "h3.article-title a"}
    },
    "DC News Now (WDVM-TV)": {
        "scrape_url": "https://www.dcnewsnow.com/news/local-news/",
        "css_selectors": {"headline": "h3.article-title a"}
    },
    "Washington City Paper": {
        "rss_url": "https://washingtoncitypaper.com/feed/"
    },
    "The Hill": {
        "rss_url": "https://thehill.com/feed/"
    },
    "Politico": {
        "rss_url": "https://www.politico.com/rss/congress.xml"
    },
    "The Washington Post": {
        "rss_url": "http://feeds.washingtonpost.com/rss/local"
    },
    "The Washington Times": {
        "rss_url": "https://www.washingtontimes.com/rss/headlines/"
    },
    
    # Global News Agencies
    "CNN": {
        "scrape_url": "https://www.cnn.com/world",
        "css_selectors": {"headline": "h3.cd__headline a"}
    },
    "BBC News": {
        "rss_url": "http://feeds.bbci.co.uk/news/world/rss.xml"
    },
    "Al Jazeera": {
        "rss_url": "https://www.aljazeera.com/xml/rss/all.xml"
    }
}

async def main():
    try:
        # Initialize the news analyzer with channels configuration
        news_analyzer = DCNewsAnalyzer(channels=channels)
        
        # Get articles and convert dictionary to list
        articles_dict = await news_analyzer.run_analysis()
        articles_list = [
            {"title": article["title"], "url": article["link"], "source": source, "summary": article.get("summary", "")}
            for source, source_articles in articles_dict.items()
            for article in source_articles
            if article.get("title") and article.get("link")  # Only include articles with required fields
        ]
        
        if not articles_list:
            logging.error("No valid articles found to process")
            return
        
        # Initialize and process with knowledge graph
        kg = NewsKnowledgeGraph(openai_api_key=os.getenv('OPENAI_API_KEY'))
        if not kg.client:
            logging.error("Failed to initialize OpenAI client")
            return
            
        await kg.process_articles(articles_list)
        
        if kg.embeddings:  # Only cluster if we have embeddings
            kg.cluster_articles()
            kg.build_knowledge_graph()
            kg.save_to_json()
            logging.info("News analysis completed successfully")
        else:
            logging.error("No embeddings generated, skipping clustering")
        
    except Exception as e:
        logging.error(f"Error in main execution: {str(e)}")
        raise

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main()) 