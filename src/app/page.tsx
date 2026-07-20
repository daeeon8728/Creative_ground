'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { saveScene, createEmptyScene } from '@/lib/scene-db';

// Animated floating 3D shape (CSS)
function FloatingShape({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className="landing-shape" style={style}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleNewScene() {
    if (creating) return;
    setCreating(true);
    const id = nanoid();
    await saveScene(createEmptyScene(id, 'Untitled Scene'));
    router.push(`/editor/${id}`);
  }

  return (
    <div className="landing-page">
      {/* Background shapes */}
      <div className="landing-bg" aria-hidden>
        <FloatingShape style={{ top: '8%', left: '6%', animationDelay: '0s' }}>
          <div className="shape shape-box" />
        </FloatingShape>
        <FloatingShape style={{ top: '15%', right: '8%', animationDelay: '0.8s' }}>
          <div className="shape shape-sphere" />
        </FloatingShape>
        <FloatingShape style={{ bottom: '20%', left: '10%', animationDelay: '1.4s' }}>
          <div className="shape shape-torus" />
        </FloatingShape>
        <FloatingShape style={{ bottom: '25%', right: '12%', animationDelay: '0.4s' }}>
          <div className="shape shape-cone" />
        </FloatingShape>
        <FloatingShape style={{ top: '50%', left: '50%', animationDelay: '1.8s' }}>
          <div className="shape shape-box small" />
        </FloatingShape>
      </div>

      {/* Nav */}
      <nav className="landing-nav">
        <span className="landing-logo">⬡ FORGE3D</span>
        <div className="landing-nav-links">
          <Link href="/gallery" className="nav-link">Gallery</Link>
          <Link href="/projects" className="nav-link">Projects</Link>
          <Link href="/api/auth/signin" className="nav-link accent-link">Sign In</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">✨ AI-Powered</div>
          <h1 className="landing-h1">
            Build 3D<br />
            <span className="landing-h1-accent">in your browser</span>
          </h1>
          <p className="landing-desc">
            Create, sculpt and share 3D scenes without installing anything.
            Powered by Nemotron 120B — just describe what you want.
          </p>

          <div className="landing-cta">
            <button
              className="cta-btn primary"
              onClick={handleNewScene}
              disabled={creating}
            >
              {creating ? 'Creating…' : '+ Start Modeling'}
            </button>
            <Link href="/gallery" className="cta-btn secondary">
              Browse Gallery →
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="landing-features">
          {[
            { icon: '⬡', title: '3D Primitives', desc: 'Box, Sphere, Cylinder, Torus and more.' },
            { icon: '✨', title: 'AI Assistant', desc: 'Describe your scene — AI builds it.' },
            { icon: '📂', title: 'OBJ / FBX Import', desc: 'Bring your existing models in.' },
            { icon: '🌐', title: 'Community Gallery', desc: 'Share your creations and explore others.' },
            { icon: '📦', title: 'GLB Export', desc: 'Download production-ready 3D files.' },
            { icon: '💾', title: 'Auto-Save', desc: 'Your scenes are stored locally, instantly.' },
          ].map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© 2026 Forge3D</span>
        <span>·</span>
        <Link href="/gallery" className="nav-link">Gallery</Link>
        <span>·</span>
        <Link href="/projects" className="nav-link">My Projects</Link>
      </footer>
    </div>
  );
}
