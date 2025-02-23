"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import { data } from './data';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import { analyzeText } from '@/services/openai';

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
  type: 'article' | 'topic' | 'source';
  val?: number;
  x?: number;
  y?: number;
  z?: number;
  articles?: Set<string>;
  articleCount?: number;
  topics?: number;
  highlighted?: boolean;
  __threeObj?: any;
  fx?: number;
  fy?: number;
  fz?: number;
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

export default React.forwardRef<{ highlightNodes: (nodeIds: string[]) => void }>(
  function KnowledgeGraph(_, ref) {
    const [mounted, setMounted] = useState(false);
    const [graphData, setGraphData] = useState<GraphData>(defaultData);
    const fgRef = useRef<ForceGraphMethods | null>(null);
    const [focusedNode, setFocusedNode] = useState<GraphNode | null>(null);
    const [isTextMode, setIsTextMode] = useState(false);
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

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

    const focusOnNode = useCallback((node: GraphNode) => {
      if (!node || !fgRef.current) return;

      // Fix node position
      const pos = {
        x: node.x || 0,
        y: node.y || 0,
        z: node.z || 0
      };

      // Fix the node in place
      node.fx = pos.x;
      node.fy = pos.y;
      node.fz = pos.z;

      // Initial zoom out
      fgRef.current.cameraPosition(
        { x: pos.x, y: pos.y, z: pos.z + 500 },
        { x: pos.x, y: pos.y, z: pos.z },
        0
      );

      // Zoom in animation
      setTimeout(() => {
        fgRef.current?.cameraPosition(
          { x: pos.x, y: pos.y, z: pos.z + 150 },
          { x: pos.x, y: pos.y, z: pos.z },
          1500
        );

        // Start pulsing animation
        let startTime = Date.now();
        const animate = () => {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime < 2000) { // 2 second animation
            const scale = 1.5 + Math.sin(elapsedTime * 0.01) * 0.3;

            // Update node size
            node.val = 100 * scale;

            // Update node visual
            if (node.__threeObj) {
              node.__threeObj.scale.set(scale, scale, scale);
            }

            // Force graph update
            fgRef.current?.refresh();

            requestAnimationFrame(animate);
          } else {
            // Reset node after animation
            node.fx = undefined;
            node.fy = undefined;
            node.fz = undefined;
            node.val = node.type === 'article' ? 35 : 40;
          }
        };
        animate();
      }, 100);
    }, []);

    const highlightNodes = useCallback((nodeIds: string[]) => {
      if (!nodeIds.length) return;

      // Find the article node
      const articleNode = graphData.nodes.find(node =>
        nodeIds.includes(node.id) &&
        node.type === 'article'
      );

      if (articleNode) {
        // Reset all nodes first
        graphData.nodes.forEach(node => {
          node.val = node.type === 'article' ? 35 : 40;
          if (node.__threeObj) {
            node.__threeObj.scale.set(1, 1, 1);
          }
        });

        // Highlight all relevant nodes
        nodeIds.forEach(id => {
          const node = graphData.nodes.find(n => n.id === id);
          if (node) {
            node.val = node.type === 'article' ? 100 : 60;
            if (node.__threeObj) {
              node.__threeObj.scale.set(1.5, 1.5, 1.5);
            }
          }
        });

        // Update state
        setGraphData({ ...graphData });
        setHighlightedNodes(new Set(nodeIds));
        setFocusedNode(articleNode);

        // Focus on the article node
        focusOnNode(articleNode);
      }
    }, [graphData, focusOnNode]);

    const getNodeColor = useCallback((node: GraphNode) => {
      if (highlightedNodes.has(node.id)) {
        return colors.highlight;
      }
      if (focusedNode?.id === node.id) {
        return colors.highlight;
      }
      return colors[node.type] || colors.text;
    }, [focusedNode, highlightedNodes]);

    const createNodeObject = useCallback((node: GraphNode) => {
      if (!isTextMode && node.type !== 'article') return null;

      const sprite = new SpriteText(node.name);
      const isHighlighted = highlightedNodes.has(node.id);

      // Adjust text properties based on highlight state
      sprite.color = isHighlighted ? '#FFFFFF' : colors.text;
      sprite.textHeight = isHighlighted ? 16 : (node.type === 'article' ? 8 : 10);
      sprite.backgroundColor = isHighlighted
        ? 'rgba(253, 224, 71, 0.9)'  // Even brighter highlight
        : node.type === 'article'
          ? 'rgba(255, 107, 107, 0.2)'
          : node.type === 'topic'
            ? 'rgba(74, 222, 128, 0.2)'
            : 'rgba(96, 165, 250, 0.2)';

      // Add scaling for highlighted nodes
      if (isHighlighted) {
        sprite.scale.set(2, 2, 2);
      }

      return sprite;
    }, [isTextMode, highlightedNodes]);

    useEffect(() => {
      let animationFrameId: number;
      let frame = 0;

      const animate = () => {
        frame++;
        if (fgRef.current) {
          graphData.nodes.forEach(node => {
            if (highlightedNodes.has(node.id) && node.__threeObj) {
              const scale = 1.2 + Math.sin(frame * 0.05) * 0.2;
              node.__threeObj.scale.set(scale, scale, scale);
            }
          });
          fgRef.current.refresh();
        }
        animationFrameId = requestAnimationFrame(animate);
      };

      if (highlightedNodes.size > 0) {
        animate();
      }

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [graphData.nodes, highlightedNodes]);

    // Add ref implementation
    React.useImperativeHandle(ref, () => ({
      highlightNodes
    }), [highlightNodes]);

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
            nodeThreeObject={createNodeObject}
            nodeAutoColorBy="type"
            onNodeClick={handleClick}
            nodeColor={getNodeColor}
            linkColor={(link: any) => colors.link[link.type === 'article-topic' ? 'topic' : 'source']}
            linkWidth={focusedNode ? 0.2 : 0.6}
            backgroundColor={colors.background}
            nodeVal={node => (highlightedNodes.has(node.id) ? 60 : node.val || 40)}
            nodeResolution={16} // Higher resolution for smoother nodes
            warmupTicks={100} // More ticks for better initial layout
            cooldownTicks={50} // Fewer ticks for faster stabilization
            onEngineStop={() => {
              const highlightedNode = graphData.nodes.find(node =>
                highlightedNodes.has(node.id) && node.type === 'article'
              );
              if (highlightedNode) {
                focusOnNode(highlightedNode);
              }
            }}
          />
        </div>
      </div>
    );
  }
);