"use client";

import React, { useState } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VoiceRecorder from './voice-recorder';
import AttachmentModal from './attachment-modal';

interface InputFormProps {
  onSubmit: (message: string) => void;
}

export default function InputForm({ onSubmit }: InputFormProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSubmit(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowAttachments(true)}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsRecording(!isRecording)}
        >
          <Mic className="h-5 w-5" />
        </Button>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 p-2"
          placeholder="Type your message..."
        />

        <Button type="submit" variant="default">
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {isRecording && <VoiceRecorder onStop={(blob) => console.log(blob)} />}
      {showAttachments && (
        <AttachmentModal onClose={() => setShowAttachments(false)} />
      )}
    </form>
  );
}