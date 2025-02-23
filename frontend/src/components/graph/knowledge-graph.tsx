"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import { data } from './data';
import type { ForceGraphMethods } from 'react-force-graph-3d';

// Dynamically import ForceGraph3D with no SSR
const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d'),
  {
    ssr: false,
    loading: () => null
  }
);

interface GraphNode {
  id: string;
  name: string;
  type: string;
  val?: number;
  x?: number;
  y?: number;
  z?: number;
  articles?: Set<string>;
  articleCount?: number;
  topics?: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: {
    source: string;
    target: string;
    type?: string;
  }[];
}

const colors = {
  background: '#030712',
  article: '#FF6B6B',    
  topic: '#4ADE80',  
  source: '#60A5FA',      
  highlight: '#FDE047',   
  text: '#FFFFFF',      
  link: {
    topic: 'rgba(245, 245, 222, 0.6)',
    source: 'rgba(100, 27, 23, 0.8)'
  }
} as const;

const defaultData: GraphData = {
  nodes: [],
  links: []
};

export default function KnowledgeGraph() {
  const [mounted, setMounted] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>(defaultData);
  const fgRef = useRef<ForceGraphMethods | null>(null);
  const [focusedNode, setFocusedNode] = useState<GraphNode | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }

    const nodes: GraphNode[] = [];
    const links: { source: string; target: string; type?: string }[] = [];

    if (data?.articles) {
      const topicsMap = new Map<string, GraphNode>();
      const sourcesMap = new Map<string, GraphNode>();

      data.articles.forEach((article) => {
        nodes.push({
          id: article.title,
          name: article.title,
          type: 'article',
          val: 35
        });

        article.topics?.forEach(topic => {
          const topicId = `topic-${topic}`;
          if (!topicsMap.has(topic)) {
            topicsMap.set(topic, {
              id: topicId,
              name: topic,
              type: 'topic',
              val: 40,
              articles: new Set()
            });
          }
          topicsMap.get(topic)?.articles?.add(article.title);
          links.push({
            source: article.title,
            target: topicId,
            type: 'article-topic'
          });
        });

        const sourceId = `source-${article.source}`;
        if (!sourcesMap.has(article.source)) {
          sourcesMap.set(article.source, {
            id: sourceId,
            name: article.source,
            type: 'source',
            val: 45,
            articles: new Set()
          });
        }
        sourcesMap.get(article.source)?.articles?.add(article.title);
        links.push({
          source: article.title,
          target: sourceId,
          type: 'article-source'
        });
      });

      [...topicsMap.values(), ...sourcesMap.values()].forEach(node => {
        nodes.push({
          ...node,
          articleCount: node.articles?.size || 0,
          val: 40 + ((node.articles?.size || 0) * 3)
        });
      });
    }

    setGraphData({ nodes, links });
  }, [mounted]);

  const handleClick = useCallback((node: GraphNode) => {
    if (!node || !fgRef.current) return;

    const distance = 200;
    const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);

    fgRef.current.cameraPosition(
      {
        x: (node.x || 0) * distRatio,
        y: (node.y || 0) * distRatio,
        z: (node.z || 0) * distRatio
      },
      { x: 0, y: 0, z: 0 },
      3000
    );
    setFocusedNode(node);
  }, []);

  if (!mounted) {
    return <div className="w-full h-screen bg-[#030712]" />;
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 p-2 rounded-lg">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isTextMode}
            onChange={(e) => setIsTextMode(e.target.checked)}
            className="sr-only"
          />
          <div className="relative w-11 h-6 bg-gray-400 rounded-full transition-colors duration-300 ease-in-out hover:bg-gray-500">
            <div
              className={`
                absolute left-1 top-1/2 -translate-y-1/2
                w-4 h-4 bg-black rounded-full 
                transform transition-all duration-300 ease-in-out shadow-md
                ${isTextMode ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </div>
          <span className="ml-3 text-sm font-medium text-white select-none">
            {isTextMode ? 'Text Mode' : 'Default Mode'}
          </span>
        </label>
      </div>
      <div className="force-graph h-screen w-full">
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          nodeThreeObject={(node: GraphNode) => {
            if (!isTextMode && node.type !== 'article') return null;

            const sprite = new SpriteText(node.name);
            sprite.color = colors.text;
            sprite.textHeight = node.type === 'article' ? 8 : 12;
            return sprite;
          }}
          nodeAutoColorBy="type"
          onNodeClick={handleClick}
          nodeColor={(node: GraphNode) => {
            if (focusedNode?.id === node.id) {
              return colors.highlight;
            }
            return colors[node.type] || colors.text;
          }}
          linkColor={(link: any) => colors.link[link.type === 'article-topic' ? 'topic' : 'source']}
          linkWidth={focusedNode ? 0.4 : 0.8}
          backgroundColor={colors.background}
        />
      </div>
    </div>
  );
}