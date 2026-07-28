'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import MiniViewer from './MiniViewer';
import type { GalleryPost } from '@/lib/scene-types';

interface Props {
  post: GalleryPost;
  rank?: number;
  rankMedal?: string;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getTotalReactions(post: GalleryPost): number {
  return (post.reactions ?? []).reduce((s, r) => s + r.userIds.length, 0) + (post.likes ?? []).length;
}

export default function GalleryCard({ post, rank, rankMedal }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHovered) {
      hoverTimer.current = setTimeout(() => {
        setShow3D(true);
      }, 500); // 500ms delay before loading 3D
    } else {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setShow3D(false);
    }
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, [isHovered]);

  return (
    <div 
      className={`gallery-card-wrapper ${rank !== undefined ? `rank-${rank + 1}` : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/gallery/${post.id}`} className="gallery-card-link">
        {rankMedal && (
          <span className="gallery-card-medal">{rankMedal}</span>
        )}
        <div className="gallery-card-thumb-container">
          {show3D ? (
            <div className="gallery-card-3d">
              <MiniViewer sceneId={post.id} />
            </div>
          ) : (
            post.thumbnail ? (
              <img src={post.thumbnail} alt={post.title} className="gallery-card-img" />
            ) : (
              <div className="gallery-card-placeholder">⬡</div>
            )
          )}
        </div>
      </Link>
      
      <div className="gallery-card-info">
        <Link href={`/gallery/${post.id}`} className="gallery-card-title-link">
          <p className="gallery-card-title">{post.title}</p>
        </Link>
        <div className="gallery-card-meta">
          <Link href={`/profile/${post.username}`} className="gallery-card-user" onClick={(e) => e.stopPropagation()}>
            @{post.username}
          </Link>
          <span className="meta-dot">·</span>
          <span>{timeAgo(post.createdAt)}</span>
          <span className="meta-dot">·</span>
          <span>👁 {post.views ?? 0}</span>
          <span className="meta-dot">·</span>
          <span>❤️ {getTotalReactions(post)}</span>
        </div>
        {post.description && (
          <p className="gallery-card-desc">{post.description}</p>
        )}
      </div>
    </div>
  );
}
