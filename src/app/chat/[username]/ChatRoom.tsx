'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import type { ChatMessage } from '@/lib/chat';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ChatRoom({ targetUsername }: { targetUsername: string }) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<{ messages: ChatMessage[] }>(`/api/chat/${targetUsername}`, fetcher, {
    refreshInterval: 3000,
  });

  const messages = data?.messages ?? [];
  const myUsername = session?.user?.username;

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    
    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      sender: myUsername ?? '',
      content: content.trim(),
      timestamp: Date.now(),
    };
    
    mutate({ messages: [...messages, optimisticMsg] }, false);
    const text = content;
    setContent('');

    try {
      const res = await fetch(`/api/chat/${targetUsername}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        mutate(); // re-fetch actual messages
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-room">
      <div className="chat-room-header">
        <h2>@{targetUsername}</h2>
      </div>
      
      <div className="chat-messages-area">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((msg) => {
              const isMine = msg.sender.toLowerCase() === myUsername?.toLowerCase();
              return (
                <div key={msg.id} className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                  <div className="chat-bubble">
                    <p className="chat-bubble-text">{msg.content}</p>
                    <span className="chat-bubble-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message..."
          className="chat-input"
          disabled={!myUsername || sending}
        />
        <button type="submit" className="toolbar-btn accent chat-send-btn" disabled={!content.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  );
}
