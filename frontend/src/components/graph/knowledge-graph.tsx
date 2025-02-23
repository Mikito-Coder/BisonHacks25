"use client";

import React, { useCallback, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import { data } from './data';

// Dynamically import ForceGraph3D with no SSR
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

const colors = {
  background: '#030712',
  article: '#FF6B6B',     // For news articles
  topic: '#4ADE80',       // For topics
  source: '#60A5FA',      // For news sources
  highlight: '#FDE047',   // For highlights
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8'
  },
  link: {
    default: 'rgba(148, 163, 184, 0.3)',
    highlight: 'rgba(244, 63, 94, 0.6)'
  }
};

const KnowledgeGraph = () => {
  const fgRef = useRef();
  const [focusedNode, setFocusedNode] = useState(null);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const articles = Object.entries(data.articles_metadata);
    
    // Create topics and sources maps
    const topicsMap = new Map();
    const sourcesMap = new Map();
    
    articles.forEach(([id, article]) => {
      // Add topics
      article.topics?.forEach(topic => {
        if (!topicsMap.has(topic)) {
          topicsMap.set(topic, {
            id: `topic-${topic}`,
            name: topic,
            type: 'topic',
            val: 40,
            articles: new Set()
          });
        }
        topicsMap.get(topic).articles.add(id);
      });

      // Add sources
      const source = article.source;
      if (!sourcesMap.has(source)) {
        sourcesMap.set(source, {
          id: `source-${source}`,
          name: source,
          type: 'source',
          val: 45,
          articles: new Set()
        });
      }
      sourcesMap.get(source).articles.add(id);
    });

    // Add nodes and links
    [...topicsMap.values(), ...sourcesMap.values()].forEach(node => {
      nodes.push({
        ...node,
        articleCount: node.articles.size,
        val: 40 + (node.articles.size * 3)
      });
    });

    articles.forEach(([id, article]) => {
      nodes.push({
        id,
        name: article.title,
        type: 'article',
        val: 35,
        topics: article.topics?.length || 0
      });

      // Connect to topics and source
      article.topics?.forEach(topic => {
        links.push({
          source: id,
          target: `topic-${topic}`,
          type: 'article-topic'
        });
      });

      links.push({
        source: id,
        target: `source-${article.source}`,
        type: 'article-source'
      });
    });

    return { nodes, links };
  }, []);

  const handleClick = useCallback((node) => {
    if (!node) return;
    setFocusedNode(node);
  }, []);

  return (
    <div className="force-graph" style={{ width: '100%', height: '100vh' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeThreeObject={node => {
          const sprite = new SpriteText(node.name);
          sprite.color = focusedNode?.id === node.id ? colors.highlight : colors.text.primary;
          sprite.textHeight = node.type === 'article' ? 8 : 12;
          sprite.backgroundColor = 
            focusedNode?.id === node.id ? 'rgba(253, 224, 71, 0.3)' :
            node.type === 'article' ? 'rgba(255, 107, 107, 0.2)' :
            node.type === 'topic' ? 'rgba(74, 222, 128, 0.2)' :
            'rgba(96, 165, 250, 0.2)';
          return sprite;
        }}
        nodeColor={node => colors[node.type] || colors.text.primary}
        linkColor={link => link.type === 'article-topic' ? colors.topic : colors.source}
        backgroundColor={colors.background}
        onNodeClick={handleClick}
      />
      {focusedNode && (
        <InfoPanel 
          node={focusedNode} 
          onClose={() => setFocusedNode(null)}
          data={data}
          onArticleClick={handleClick}
        />
      )}
    </div>
  );
};

export default KnowledgeGraph;