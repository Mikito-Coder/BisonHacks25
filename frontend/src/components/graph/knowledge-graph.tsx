"use client";

import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Node {
  id: string;
  name: string;
  val?: number;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
}

interface Link {
  source: string;
  target: string;
  color?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const sampleData: GraphData = {
  nodes: [
    { id: 'concept1', name: 'Machine Learning', val: 20, color: '#ff7700' },
    { id: 'concept2', name: 'Neural Networks', val: 15, color: '#00ff77' },
    { id: 'concept3', name: 'Deep Learning', val: 18, color: '#7700ff' },
    { id: 'concept4', name: 'Computer Vision', val: 12, color: '#ff0077' },
    { id: 'concept5', name: 'NLP', val: 14, color: '#77ff00' }
  ],
  links: [
    { source: 'concept1', target: 'concept2' },
    { source: 'concept1', target: 'concept3' },
    { source: 'concept2', target: 'concept4' },
    { source: 'concept3', target: 'concept5' },
    { source: 'concept2', target: 'concept3' }
  ]
};

interface KnowledgeGraphProps {
  className?: string;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize force graph
    graphRef.current = ForceGraph3D()(mountRef.current)
      .graphData(sampleData)
      .nodeLabel('name')
      .nodeColor('color')
      .nodeVal('val')
      .nodeResolution(8)
      .nodeOpacity(0.9)
      .linkWidth(2)
      .linkOpacity(0.4)
      .backgroundColor('#000011')
      .showNavInfo(true)
      .enableNodeDrag(true)
      .enableNavigationControls(true)
      .enablePointerInteraction(true);

    // Add node click event
    graphRef.current.onNodeClick((node: Node) => {
      setSelectedNode(node);
      
      // Focus camera on clicked node
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x || 0, node.y || 0, node.z || 0);

      graphRef.current.cameraPosition(
        { 
          x: (node.x || 0) * distRatio, 
          y: (node.y || 0) * distRatio, 
          z: (node.z || 0) * distRatio 
        },
        node,
        1000
      );
    });

    // Handle background click to deselect node
    graphRef.current.onBackgroundClick(() => {
      setSelectedNode(null);
    });

    // Add custom node three.js objects for better text visibility
    graphRef.current
      .nodeThreeObject((node: Node) => {
        const sprite = new window.SpriteText(node.name);
        sprite.material.depthWrite = false;
        sprite.color = node.color || '#ffffff';
        sprite.textHeight = 8;
        return sprite;
      });

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current && graphRef.current) {
        graphRef.current.width(mountRef.current.clientWidth);
        graphRef.current.height(mountRef.current.clientHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Set initial dimensions
    handleResize();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) {
        graphRef.current._destructor();
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div 
        ref={mountRef} 
        className="w-full h-full bg-gray-900"
      />
      
      {/* Node Info Panel */}
      {selectedNode && (
        <Card className="absolute bottom-4 left-4 p-4 bg-gray-800/80 backdrop-blur-sm text-white">
          <h3 className="text-lg font-bold mb-2">{selectedNode.name}</h3>
          <div className="text-sm">
            <p>Connections: {
              sampleData.links.filter(link => 
                link.source === selectedNode.id || link.target === selectedNode.id
              ).length
            }</p>
          </div>
        </Card>
      )}

      {/* Controls Panel */}
      <Card className="absolute top-4 right-4 p-4 bg-gray-800/80 backdrop-blur-sm text-white">
        <div className="text-sm space-y-2">
          <p>🖱️ Left click: Rotate</p>
          <p>🖱️ Right click: Pan</p>
          <p>🖱️ Scroll: Zoom</p>
          <p>🖱️ Click node: Focus</p>
        </div>
      </Card>
    </div>
  );
};

export default KnowledgeGraph;