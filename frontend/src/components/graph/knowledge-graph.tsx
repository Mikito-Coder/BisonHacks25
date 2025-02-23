"use client";

import React, { useRef, useEffect } from 'react';
import { NodeObject } from '3d-force-graph';
import ForceGraph3D from '3d-force-graph';

const KnowledgeGraph: React.FC = () => {
  const graphRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const graphData = await response.json();
        
        const graph = new ForceGraph3D(graphRef.current)
          .width(window.innerWidth)
          .height(window.innerHeight)
          .graphData(graphData)
          .nodeLabel((node: NodeObject & { user: string; description: string }) => `${node.user}: ${node.description}`)
          .nodeLabel(node => `${node.user}: ${node.description}`)
          .onNodeClick(node => console.log(`Clicked node: ${node.id}`))
          .backgroundColor('#000011');

        const handleResize = () => {
          graph
            .width(window.innerWidth)
            .height(window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          graph._destructor();
        };
      } catch (error) {
        console.error('Error loading graph data:', error);
      }
    };

    loadData();
  }, []);

  return (
    <div 
      ref={graphRef} 
      style={{ 
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: '#000011'
      }} 
    />
  );
};

export default KnowledgeGraph;