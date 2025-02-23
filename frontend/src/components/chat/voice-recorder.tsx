"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';

interface VoiceRecorderProps {
  onStop: (blob: Blob) => void;
}

export default function VoiceRecorder({ onStop }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);

  // Here you would typically implement actual recording logic
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-gray-100 rounded-lg"
    >
      <div className="flex items-center justify-center space-x-4">
        <motion.div
          animate={{
            scale: isRecording ? [1, 1.2, 1] : 1
          }}
          transition={{
            duration: 1,
            repeat: isRecording ? Infinity : 0
          }}
          className="text-red-500"
        >
          {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </motion.div>
        <span className="text-sm text-gray-600">
          {isRecording ? 'Recording...' : 'Ready to record'}
        </span>
      </div>
    </motion.div>
  );
}