"use client";

import ChatInterface from "@/components/chat/chat-interface";
import KnowledgeGraph from "@/components/graph/knowledge-graph";

export default function MainPage() {
  return (
    <main className="flex h-screen">
      <div className="h-full border-gray-700">
        <ChatInterface />
      </div>
      <div className="w-2/3 h-full">
        <KnowledgeGraph />
      </div>
    </main>
  );
}