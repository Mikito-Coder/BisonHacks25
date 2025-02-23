"use client";

import ChatInterface from "@/components/chat/chat-interface";
import KnowledgeGraph from "@/components/graph/knowledge-graph";

export default function MainPage() {
  return (
    <main className="fixed inset-0 w-full h-screen overflow-hidden">
      {/* Knowledge Graph Layer - Full Screen */}
      <div className="absolute inset-0">
        <KnowledgeGraph />
      </div>

      {/* Chat Interface Overlay */}
      <div className="relative z-10 h-full w-1/3 p-4">
        <div className="h-full rounded-xl border border-cyan-500/10 bg-slate-950/[0.1] backdrop-blur-[1px] shadow-[0_0_15px_rgba(34,211,238,0.05)] overflow-hidden">
          <div className="w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent">
            <ChatInterface />
          </div>
        </div>
      </div>
    </main>
  );
}
