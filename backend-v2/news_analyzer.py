import feedparser
import requests
from bs4 import BeautifulSoup
import logging
import os
import asyncio

class DCNewsAnalyzer:
    def __init__(self, channels):
        self.channels = channels

    async def run_analysis(self):
        analysis_results = {}
        total_articles = 0
        
        for source_name, source_info in self.channels.items():
            try:
                if 'rss_url' in source_info:
                    # Handle RSS feeds - increase from 10 to 30 articles
                    feed = feedparser.parse(source_info['rss_url'])
                    articles = feed.entries
                    
                    if not articles:
                        logging.warning(f"No articles found for RSS source: {source_name}")
                        continue
                    
                    analysis_results[source_name] = [
                        {
                            'title': entry.title,
                            'link': entry.link,
                            'published': entry.get('published'),
                            'summary': entry.get('summary', '')
                        }
                        for entry in articles[:30]  # Increased from 10 to 30
                    ]
                    total_articles += len(analysis_results[source_name])
                
                elif 'scrape_url' in source_info:
                    # Handle direct web scraping - increase from 10 to 30 articles
                    response = requests.get(source_info['scrape_url'])
                    soup = BeautifulSoup(response.content, 'html.parser')
                    headlines = soup.select(source_info['css_selectors']['headline'])
                    
                    if not headlines:
                        logging.warning(f"No headlines found for scrape source: {source_name}")
                        continue
                    
                    analysis_results[source_name] = [
                        {
                            'title': headline.text.strip(),
                            'link': headline.get('href', ''),
                            'published': None,
                            'summary': ''
                        }
                        for headline in headlines[:30]  # Increased from 10 to 30
                    ]
                    total_articles += len(analysis_results[source_name])
            
            except Exception as e:
                logging.error(f"Error analyzing source {source_name}: {str(e)}")
                continue
        
        logging.info(f"Total articles collected: {total_articles}")
        return analysis_results 

# async def main():
#     # Initialize the news analyzer
#     kg = NewsKnowledgeGraph(openai_api_key=os.getenv('OPENAI_API_KEY'))
    
#     # Get articles from your existing sources
#     articles = await get_articles()  # Your existing article collection method
    
#     # Process and analyze articles
#     await kg.process_articles(articles)
    
#     # Cluster articles
#     kg.cluster_articles()
    
#     # Build knowledge graph
#     kg.build_knowledge_graph()
    
#     # Save results
#     kg.save_to_json()

# if __name__ == "__main__":
#     asyncio.run(main()) 