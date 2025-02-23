"use client";
import React, { useEffect } from "react";
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader";
import { useRouter } from "next/navigation";

const loadingStates = [
  { text: "Loading knowledge base" },
  { text: "Connecting neural networks" },
  { text: "Initializing AI models" },
  { text: "Preparing data streams" },
  { text: "Syncing with cloud" },
  { text: "Optimizing performance" },
  { text: "Almost there" },
  { text: "Welcome to Autonomy" },
];

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const totalDuration = loadingStates.length * 2000;
    const timer = setTimeout(() => {
      router.push('/main');
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      <Loader 
        loadingStates={loadingStates} 
        loading={true} 
        duration={2000}
        loop={false}
      />
    </div>
  );
}