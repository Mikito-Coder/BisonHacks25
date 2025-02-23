"use client";

import React, { useState } from 'react';
import DocumentSection from './document-section';
import InputForm from './input-form';
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleNewMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    // Here you would typically handle the bot response
  };

  return (
    <div className="flex flex-col h-full">
      <DocumentSection messages={messages} />
      <InputForm onSubmit={handleNewMessage} />
    </div>
  );
}