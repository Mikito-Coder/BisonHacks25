"use client";

import LandingPage from "@/components/landing/landing-page";
import KnowledgeGraph from '@/components/graph/knowledge-graph';
import ChatInterface from '@/components/chat/chat-interface';
import { useRef } from 'react';
import { data } from '@/components/graph/data';

export default function Home() {
  const graphRef = useRef<{ highlightNodes: (nodeIds: string[]) => void }>(null);

  return (
    <div className="flex h-screen">
      <div className="w-2/3">
        <KnowledgeGraph ref={graphRef} />
      </div>
      <div className="w-1/3">
        <ChatInterface 
          onHighlightNodes={(nodeIds) => graphRef.current?.highlightNodes(nodeIds)}
          graphData={data}
        />
      </div>
    </div>
  );
}