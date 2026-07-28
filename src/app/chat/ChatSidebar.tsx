'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ConversationInfo } from '@/lib/chat';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ChatSidebar() {
  const params = useParams();
  const currentUsername = params?.username as string | undefined;

  const { data, error } = useSWR<{ conversations: ConversationInfo[] }>('/api/chat', fetcher, {
    refreshInterval: 5000, // Poll every 5s for new conversations
  });

  if (error) return <div className="chat-sidebar-empty">Failed to load chats.</div>;
  if (!data) return <div className="chat-sidebar-empty">Loading...</div>;

  const convos = data.conversations ?? [];

  return (
    <div className="chat-sidebar">
      <h2 className="chat-sidebar-title">Messages</h2>
      <div className="chat-sidebar-list">
        {convos.length === 0 ? (
          <p className="chat-sidebar-empty">No conversations yet.</p>
        ) : (
          convos.map((c) => {
            const active = currentUsername === c.username;
            return (
              <Link 
                key={c.username} 
                href={`/chat/${c.username}`} 
                className={`chat-sidebar-item ${active ? 'active' : ''}`}
              >
                <div className="chat-sidebar-avatar">⬡</div>
                <div className="chat-sidebar-info">
                  <div className="chat-sidebar-name">@{c.username}</div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
