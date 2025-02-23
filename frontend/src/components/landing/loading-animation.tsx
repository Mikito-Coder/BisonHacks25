"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Network, Database } from 'lucide-react';

const loadingSteps = [
  { icon: Brain, text: 'Initializing Knowledge Base' },
  { icon: Network, text: 'Establishing Connections' },
  { icon: Database, text: 'Loading Graph Data' },
  { icon: Sparkles, text: 'Preparing Visualization' }
];

export default function LoadingAnimation() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="space-y-8 max-w-md w-full">
        {loadingSteps.map((step, index) => (
          <motion.div
            key={index}
            className="flex items-center space-x-4 text-gray-300"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.5 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                delay: index * 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-8 h-8 text-blue-400"
            >
              <step.icon />
            </motion.div>
            
            <motion.div
              className="flex-1 bg-gray-800 rounded-lg p-4"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                delay: index * 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {step.text}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
