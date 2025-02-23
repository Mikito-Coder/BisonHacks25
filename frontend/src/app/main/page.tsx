"use client";

import ChatInterface from "@/components/chat/chat-interface";
import KnowledgeGraph from "@/components/graph/knowledge-graph";

export default function MainPage() {
  return (
    <main className="flex h-screen">
      <div className="w-1/2 h-full border-r border-gray-200">
        <ChatInterface />
      </div>
      <div className="w-1/2 h-full">
        <KnowledgeGraph />
      </div>
    </main>
  );
}