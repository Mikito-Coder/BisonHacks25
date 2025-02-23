"use client";

import React, { useState, useRef, useEffect } from 'react';
import { AudioLines, ArrowUp } from "lucide-react";
import '@/styles/chat.scss';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      await new Promise(resolve => setTimeout(resolve, 1000));

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm processing your request...",
        type: 'bot',
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsProcessing(true);
    // Add your recording logic here
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsProcessing(false);
    // Add your stop recording logic here
  };

  return (
    <div className="app">
      <div className="chat">
        <div className="content">
          <div className="main">
            {messages.map((message) => (
              <p key={message.id}>
                {message.content}
              </p>
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
                <textarea
                  ref={textareaRef}
                  placeholder={isRecording ? "Recording..." : "Type your message..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleNewMessage(inputValue);
                    }
                  }}
                  rows={1}
                  style={{ overflow: "hidden", resize: "none" }}
                />
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