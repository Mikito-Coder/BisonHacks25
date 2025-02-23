import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Helper function to find relevant nodes based on text
function findRelevantNodes(text: string, graphData: any) {
  // Clean and normalize search text
  const searchText = text.toLowerCase()
    .replace(/was|were|the|and|for|are|but|affected|by|about/g, '')
    .trim();

  // Search for exact phrase matches first
  let matchingArticle = graphData.articles?.find((article: any) => {
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();
    const topicsLower = article.topics.map((t: string) => t.toLowerCase());
    
    // Check for exact matches in title, summary, or topics
    return titleLower.includes(searchText) || 
           summaryLower.includes(searchText) ||
           topicsLower.some(t => t.includes(searchText));
  });

  // If no exact match, try matching keywords
  if (!matchingArticle) {
    const keywords = searchText.split(' ')
      .filter(term => term.length > 2)
      .map(term => term.toLowerCase());

    // Score each article based on keyword matches
    const scoredArticles = graphData.articles?.map((article: any) => {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const summaryLower = article.summary.toLowerCase();

      keywords.forEach(keyword => {
        if (titleLower.includes(keyword)) score += 3;
        if (summaryLower.includes(keyword)) score += 2;
        article.topics.forEach((topic: string) => {
          if (topic.toLowerCase().includes(keyword)) score += 1;
        });
      });

      return { article, score };
    });

    // Get the article with highest score
    const bestMatch = scoredArticles?.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    if (bestMatch?.score > 0) {
      matchingArticle = bestMatch.article;
    }
  }

  if (matchingArticle) {
    const relevantNodes = [
      matchingArticle.title,
      `source-${matchingArticle.source}`,
      ...matchingArticle.topics.map((topic: string) => `topic-${topic}`)
    ];

    return {
      nodes: relevantNodes,
      summary: {
        title: matchingArticle.title,
        summary: matchingArticle.summary,
        source: matchingArticle.source,
        topics: matchingArticle.topics
      }
    };
  }

  return { nodes: [], summary: null };
}

export const analyzeText = async (text: string, graphData: any) => {
  try {
    const { nodes, summary } = findRelevantNodes(text, graphData);

    if (nodes.length > 0 && summary) {
      return JSON.stringify({
        relevantNodes: nodes,
        message: `Found relevant article: "${summary.title}"`,
        summary
      });
    }

    return JSON.stringify({
      relevantNodes: [],
      message: "No relevant articles found.",
      summary: null
    });
  } catch (error) {
    console.error('Error analyzing text:', error);
    return JSON.stringify({
      relevantNodes: [],
      message: "Error processing your request.",
      summary: null
    });
  }
}; 