'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import type { GalleryPostFull, GalleryComment } from '@/lib/scene-types';
import { EditorProvider } from '@/lib/editor-context';

const Viewport = dynamic(() => import('@/components/editor/Viewport'), {
  ssr: false,
  loading: () => <div className="viewport-loading"><div className="viewport-loading-spinner" /></div>,
});

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function GalleryDetailClient({
  post,
  comments: initialComments,
  postId,
}: {
  post: GalleryPostFull;
  comments: GalleryComment[];
  postId: string;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<GalleryComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState<string[]>(post.likes ?? []);
  const [viewMode, setViewMode] = useState<'thumb' | '3d'>('thumb');

  const isLiked = session?.user?.id ? likes.includes(session.user.id) : false;

  async function handleLike() {
    if (!session) { alert('Please sign in to like.'); return; }
    const res = await fetch(`/api/gallery/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like' }),
    });
    if (res.ok) {
      const data = await res.json();
      setLikes(data.likes);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !session) return;
    const res = await fetch(`/api/gallery/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      const comment: GalleryComment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    }
  }

  return (
    <div className="gallery-detail-page">
      {/* Header */}
      <header className="gallery-detail-header">
        <Link href="/gallery" className="toolbar-btn">← Gallery</Link>
        <div className="gallery-detail-title-area">
          <h1 className="gallery-detail-title">{post.title}</h1>
          <p className="gallery-detail-meta">
            by <strong>@{post.username}</strong> · {timeAgo(post.createdAt)}
          </p>
        </div>
        <button
          className={`toolbar-btn${isLiked ? ' active' : ''}`}
          onClick={handleLike}
        >
          {isLiked ? '❤️' : '🤍'} {likes.length}
        </button>
      </header>

      <div className="gallery-detail-body">
        {/* 3D Preview */}
        <div className="gallery-detail-preview">
          <div className="preview-toggle">
            <button
              className={`toggle-btn${viewMode === 'thumb' ? ' active' : ''}`}
              onClick={() => setViewMode('thumb')}
            >
              Image
            </button>
            <button
              className={`toggle-btn${viewMode === '3d' ? ' active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              3D View
            </button>
          </div>

          {viewMode === 'thumb' ? (
            <div className="gallery-detail-thumb">
              {post.thumbnail ? (
                <img src={post.thumbnail} alt={post.title} />
              ) : (
                <div className="gallery-card-placeholder large">⬡</div>
              )}
            </div>
          ) : (
            <div className="gallery-detail-3d">
              <EditorProvider initialScene={post.scene}>
                <Viewport />
              </EditorProvider>
            </div>
          )}

          {post.description && (
            <p className="gallery-detail-desc">{post.description}</p>
          )}
        </div>

        {/* Comments */}
        <div className="gallery-comments">
          <h2 className="gallery-comments-title">Comments ({comments.length})</h2>

          {session ? (
            <form onSubmit={handleComment} className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                className="ai-input"
                rows={2}
              />
              <button type="submit" className="toolbar-btn accent" disabled={!newComment.trim()}>
                Post
              </button>
            </form>
          ) : (
            <p className="comment-sign-in">
              <Link href="/api/auth/signin" className="text-accent">Sign in</Link> to leave a comment.
            </p>
          )}

          <div className="comment-list">
            {comments.length === 0 ? (
              <p className="comment-empty">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-header">
                    <strong>@{c.username}</strong>
                    <span className="comment-time">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="comment-content">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
