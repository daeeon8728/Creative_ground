import { Metadata } from 'next';
import Link from 'next/link';
import ChatSidebar from './ChatSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/ui/NotificationBell';

export const metadata: Metadata = {
  title: 'Forge3D — Messages',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="chat-layout">
      <header className="gallery-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="gallery-header-left">
          <Link href="/gallery" className="projects-logo">⬡ FORGE3D</Link>
        </div>
        <div className="button-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
          <NotificationBell />
          <ThemeToggle />
          <Link href="/projects" className="toolbar-btn">My Projects</Link>
          <Link href="/gallery" className="toolbar-btn">Gallery</Link>
        </div>
      </header>

      <div className="chat-container">
        <aside className="chat-sidebar-area">
          <ChatSidebar />
        </aside>
        <main className="chat-main-area">
          {children}
        </main>
      </div>
    </div>
  );
}
