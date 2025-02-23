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

  // Score all articles
  const scoredArticles = graphData.articles?.map((article: any) => {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();

    // Check for exact phrase matches
    if (titleLower.includes(searchText) || summaryLower.includes(searchText)) {
      score += 10;
    }

    // Score keyword matches
    const keywords = searchText.split(' ')
      .filter(term => term.length > 2)
      .map(term => term.toLowerCase());

    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score += 3;
      if (summaryLower.includes(keyword)) score += 2;
    });

    return { article, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scoredArticles?.length > 0) {
    const mainArticle = scoredArticles[0].article;
    const relevantNodes = [
      mainArticle.title,
      `source-${mainArticle.source}`,
      ...mainArticle.topics.map((topic: string) => `topic-${topic}`)
    ];

    // Create a natural language response
    const response = `Yes, according to ${mainArticle.source}, ${mainArticle.summary}`;

    return {
      nodes: [...new Set(relevantNodes)],
      summaries: scoredArticles.map(({ article }) => ({
        title: article.title,
        content: article.summary,
        source: article.source,
        topics: article.topics
      })),
      message: response
    };
  }

  return {
    nodes: [],
    summaries: [],
    message: "No, I couldn't find any information about that in my database."
  };
}

export const analyzeText = async (text: string, graphData: any) => {
  try {
    const { nodes, summaries, message } = findRelevantNodes(text, graphData);

    if (nodes.length > 0 && summaries.length > 0) {
      return JSON.stringify({
        relevantNodes: nodes,
        message: message,
        summaries
      });
    }

    return JSON.stringify({
      relevantNodes: [],
      message: message,
      summaries: []
    });
  } catch (error) {
    console.error('Error analyzing text:', error);
    return JSON.stringify({
      relevantNodes: [],
      message: "Error processing your request.",
      summaries: []
    });
  }
}; 