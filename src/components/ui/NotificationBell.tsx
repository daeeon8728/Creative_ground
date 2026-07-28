'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import type { Notification } from '@/lib/notifications';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<{ notifications: Notification[] }>('/api/notifications', fetcher, {
    refreshInterval: 10000, // Poll every 10s
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) {
      // Mark as read locally and on server
      const updated = notifications.map(n => ({ ...n, read: true }));
      mutate({ notifications: updated }, false);
      try {
        await fetch('/api/notifications', { method: 'PUT' });
      } catch (e) {
        console.error(e);
      }
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={handleOpen} 
        className="toolbar-btn icon-only relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--riso-coral)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[var(--shadow-ink)] rounded z-50 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[var(--ink)] font-bold bg-[var(--surface-2)]">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm opacity-60">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  className={`block p-3 border-b border-gray-200 dark:border-gray-800 hover:bg-[var(--surface-2)] text-sm ${!n.read ? 'font-semibold bg-[rgba(26,92,255,0.05)]' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  {n.type === 'comment' ? (
                    <span><strong>@{n.actor}</strong> commented on your post</span>
                  ) : (
                    <span><strong>@{n.actor}</strong> started following you</span>
                  )}
                  <div className="text-xs opacity-50 mt-1">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
