"use client";
import React from "react";
import { motion } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";
import { Button } from "@/components/ui/moving-border";
import { FlipWords } from "@/components/ui/flip-words";
import { useRouter } from "next/navigation";

export function LandingPage() {
  const router = useRouter();
  const words = [
    "connect the dots",
    "unlock new insights",
    "find truth"
  ];

  const handleExplore = () => {
    router.push('/loading');  // Navigate to loading screen
  };

  return (
    <LampContainer>
      <div className="flex flex-col items-center gap-8">
        <motion.h1
          initial={{ opacity: 0.5, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="mt-2 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
        >
          autonomy
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.8,
            duration: 0.5,
            ease: "easeInOut",
          }}
          className="text-center text-2xl md:text-3xl flex items-center gap-2"
        >
          <span className="text-slate-300">the fastest way to</span>
          <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
            <FlipWords words={words} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 1,
            duration: 0.5,
            ease: "easeInOut",
          }}
        >
          <Button
            onClick={handleExplore}
            className="text-white dark:text-black font-semibold"
          >
            Explore
          </Button>
        </motion.div>
      </div>
    </LampContainer>
  );
}

export default LandingPage;
