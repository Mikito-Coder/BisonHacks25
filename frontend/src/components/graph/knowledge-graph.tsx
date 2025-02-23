"use client";

import React, { useRef, useEffect, useState } from 'react';
import { NodeObject } from '3d-force-graph';
import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';

const KnowledgeGraph: React.FC = () => {
  const graphRef = useRef<any>(null);
  const [isTextMode, setIsTextMode] = useState(false);

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
          .nodeThreeObject((node: NodeObject & { user: string; description: string }) => {
            if (isTextMode) {
              const sprite = new SpriteText(`${node.user}: ${node.description}`);
              sprite.color = 'white';
              sprite.textHeight = 8;
              return sprite;
            }
            return null;
          })
          .nodeLabel((node: NodeObject & { user: string; description: string }) => `${node.user}: ${node.description}`)
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
  }, [isTextMode]);

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
            <div
              className={`
                absolute inset-0 rounded-full
                transition-colors duration-300 ease-in-out
                ${isTextMode ? 'bg-blue-600' : ''}
              `}
            />
          </div>
          <span className="ml-3 text-sm font-medium text-white select-none">
            {isTextMode ? 'Text Mode' : 'Default Mode'}
          </span>
        </label>
      </div>
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
    </div>
  );
};

export default KnowledgeGraph;