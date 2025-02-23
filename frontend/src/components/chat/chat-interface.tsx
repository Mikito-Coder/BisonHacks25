"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioLines, ArrowUp } from "lucide-react";
import '@/styles/chat.scss';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { analyzeText } from '@/services/openai';
import { data } from '@/components/graph/data';

// Define proper types for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
  }
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  summaries?: Array<{
    title: string;
    content: string;
    source: string;
    topics: string[];
  }>;
}

interface ChatInterfaceProps {
  onHighlightNodes?: (nodeIds: string[]) => void;
  graphData?: any;
}

export default function ChatInterface({ onHighlightNodes, graphData = data }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Add audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioQueue = useRef<ArrayBuffer[]>([]);
  const isPlayingAudio = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const placeholders = [
    "Ask me anything...",
    "What would you like to know?",
    "Type your question here...",
    "I'm here to help...",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8555/ws');

    // Initialize Audio Context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);

    // WebSocket event handlers
    wsRef.current.onmessage = async (event) => {
      const data = await event.data.arrayBuffer();
      audioQueue.current.push(data);

      if (!isPlayingAudio.current) {
        playNextAudioChunk();
      }
    };

    return () => {
      wsRef.current?.close();
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setSpeechSynthesis(window.speechSynthesis);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const playNextAudioChunk = async () => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    if (audioQueue.current.length === 0) {
      isPlayingAudio.current = false;
      return;
    }

    isPlayingAudio.current = true;
    const audioData = audioQueue.current.shift()!;

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(gainNodeRef.current);
      sourceNode.start();
      sourceNode.onended = playNextAudioChunk;
    } catch (error) {
      console.error('Error playing audio:', error);
      playNextAudioChunk(); // Continue with next chunk if there's an error
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setInputValue(transcript);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionError) => {
      console.error('Speech recognition error:', event.error);
      handleStopRecording();
    };

    recognitionRef.current.start();
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Optimize speech parameters for natural sound
      utterance.rate = 0.9;      // Slightly slower for clarity
      utterance.pitch = 1.0;     // Natural pitch
      utterance.volume = 1.0;    // Full volume

      // Get available voices and find the best one
      const voices = window.speechSynthesis.getVoices();

      // Priority list of preferred voices (based on common high-quality voices)
      const preferredVoices = [
        'Google UK English Female',
        'Microsoft Libby Online (Natural)',
        'Microsoft Sarah Online (Natural)',
        'Samantha',
        'Karen',
        'Moira',
        'Microsoft Aria Online (Natural)'
      ];

      // Try to find a preferred voice
      let selectedVoice = voices.find(voice =>
        preferredVoices.includes(voice.name) &&
        voice.lang.includes('en')
      );

      // Fallback to any good quality female English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice =>
          voice.name.includes('Female') &&
          voice.lang.includes('en-US') &&
          !voice.name.includes('Microsoft Zira')  // Avoid less natural voices
        );
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Add natural pauses at punctuation
      utterance.text = text.replace(/([.,!?])\s*/g, '$1, ');

      // Optional: Add event handlers for better control
      utterance.onstart = () => {
        console.log('Started speaking');
      };

      utterance.onend = () => {
        console.log('Finished speaking');
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const formatSpeechText = (message: Message): string => {
    // Just read the main response message which now includes the source and summary
    return message.content;
  };

  const handleNewMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date(),
      status: 'sent'
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const analysisResult = await analyzeText(content, graphData);
      const analysis = JSON.parse(analysisResult);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: analysis.message, // This now contains the natural language response
        type: 'bot',
        timestamp: new Date(),
        status: 'sent',
        summaries: analysis.summaries
      };

      setMessages(prev => [...prev, botMessage]);

      // First highlight the nodes
      if (analysis.relevantNodes && onHighlightNodes) {
        onHighlightNodes(analysis.relevantNodes);
      }

      // Speak the natural language response
      speakText(formatSpeechText(botMessage));

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsProcessing(true);
    startSpeechRecognition();
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsProcessing(false);
  };

  return (
    <div className="app">
      <div className="chat">
        <div className="content">
          <div className="main">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <p>{message.content}</p>
                {message.summaries?.map((summary, index) => (
                  <div key={index} className="summary bg-gray-800 rounded-lg p-4 mt-2">
                    <h3 className="text-lg font-semibold text-white">{summary.title}</h3>
                    <p className="text-gray-300 mt-2">{summary.content}</p>
                    <div className="mt-2">
                      <span className="text-blue-400">Source: {summary.source}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {summary.topics.map(topic => (
                        <span key={topic} className="bg-green-600 text-white px-2 py-1 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="bottom">
            <div className="input-box">
              <div className={`left ${isRecording || isProcessing ? "blurred" : ""}`}>
                {isRecording ? (
                  <div className="reddot" onClick={handleStopRecording}></div>
                ) : (
                  <div className="btnx" onClick={handleStartRecording}>
                    <AudioLines size={20} />
                  </div>
                )}
                <div className="relative w-full">
                  <textarea
                    ref={textareaRef}
                    placeholder={isRecording ? "Recording..." : ""}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNewMessage(inputValue);
                      }
                    }}
                    className={cn(
                      "w-full resize-none bg-transparent outline-none p-2",
                      isRecording || isProcessing ? "blurred" : ""
                    )}
                    rows={1}
                    style={{ overflow: "hidden" }}
                  />
                  <AnimatePresence>
                    {!inputValue && !isRecording && (
                      <motion.span
                        className="absolute left-0 top-0 text-gray-400 pointer-events-none p-2 w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {placeholders[placeholderIndex]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <button
                onClick={() => handleNewMessage(inputValue)}
                disabled={isRecording || isProcessing}
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}