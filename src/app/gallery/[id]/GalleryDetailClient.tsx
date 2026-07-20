'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import type { GalleryPostFull, GalleryComment, GalleryReaction } from '@/lib/scene-types';
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

const DEFAULT_EMOJIS = ['❤️', '😂', '😮', '🔥', '👏', '😢'];

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
  const router = useRouter();
  const [comments, setComments] = useState<GalleryComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [reactions, setReactions] = useState<GalleryReaction[]>(post.reactions ?? []);
  const [views, setViews] = useState<number>(post.views ?? 0);
  const [viewMode, setViewMode] = useState<'thumb' | '3d'>('thumb');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [deleting, setDeleting] = useState(false);

  const userId = session?.user?.id ?? session?.user?.email ?? null;
  const isOwner = userId && post.userId === userId;
  const isAdmin = session?.user?.role === 'admin';
  const canDelete = isOwner || isAdmin;

  // Increment view count on mount
  useEffect(() => {
    fetch(`/api/gallery/${postId}/view`, { method: 'POST' }).catch(() => {});
  }, [postId]);

  async function handleReact(emoji: string) {
    if (!session) { alert('로그인이 필요합니다.'); return; }
    const res = await fetch(`/api/gallery/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'react', emoji }),
    });
    if (res.ok) {
      const data = await res.json();
      setReactions(data.reactions ?? []);
    }
    setShowEmojiPicker(false);
  }

  async function handleCustomEmoji(e: React.FormEvent) {
    e.preventDefault();
    const emoji = customEmoji.trim();
    if (!emoji) return;
    await handleReact(emoji);
    setCustomEmoji('');
  }

  async function handleDelete() {
    if (!confirm('이 게시물을 삭제하시겠습니까?')) return;
    setDeleting(true);
    const res = await fetch(`/api/gallery/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/gallery');
    } else {
      alert('삭제에 실패했습니다.');
      setDeleting(false);
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

  // Merge default emojis with any reactions that already exist
  const allEmojis = Array.from(new Set([
    ...DEFAULT_EMOJIS,
    ...reactions.map((r) => r.emoji),
  ]));

  return (
    <div className="gallery-detail-page">
      {/* Header */}
      <header className="gallery-detail-header">
        <Link href="/gallery" className="toolbar-btn">← Gallery</Link>
        <div className="gallery-detail-title-area">
          <h1 className="gallery-detail-title">{post.title}</h1>
          <p className="gallery-detail-meta">
            by <strong>@{post.username}</strong> · {timeAgo(post.createdAt)} · 👁 {views} views
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {canDelete && (
            <button
              className="toolbar-btn"
              onClick={handleDelete}
              disabled={deleting}
              style={{ borderColor: 'var(--riso-coral)', color: 'var(--riso-coral)' }}
            >
              {deleting ? '삭제 중…' : '🗑 Delete'}
            </button>
          )}
        </div>
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
                <img src={post.thumbnail} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="gallery-card-placeholder" style={{ fontSize: '6rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⬡</div>
              )}
            </div>
          ) : (
            <div className="gallery-detail-3d">
              <EditorProvider initialScene={post.scene}>
                <Viewport />
              </EditorProvider>
            </div>
          )}

          {/* Emoji Reactions */}
          <div className="reactions-bar">
            <div className="reactions-list">
              {allEmojis.map((emoji) => {
                const r = reactions.find((x) => x.emoji === emoji);
                const count = r?.userIds.length ?? 0;
                const myReacted = userId ? (r?.userIds.includes(userId) ?? false) : false;
                return (
                  <button
                    key={emoji}
                    className={`reaction-btn${myReacted ? ' reacted' : ''}`}
                    onClick={() => handleReact(emoji)}
                    title={emoji}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="reaction-count">{count}</span>}
                  </button>
                );
              })}

              {/* + Add custom emoji */}
              <div className="reaction-picker-wrap">
                <button
                  className="reaction-btn add-reaction-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add reaction"
                >
                  ➕
                </button>
                {showEmojiPicker && (
                  <div className="reaction-picker">
                    <p className="reaction-picker-label">원하는 이모지 입력</p>
                    <form onSubmit={handleCustomEmoji} className="reaction-picker-form">
                      <input
                        type="text"
                        value={customEmoji}
                        onChange={(e) => setCustomEmoji(e.target.value)}
                        placeholder="😊"
                        className="reaction-picker-input"
                        maxLength={4}
                        autoFocus
                      />
                      <button type="submit" className="toolbar-btn accent" style={{ padding: '0.25rem 0.5rem' }}>+</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                placeholder="댓글을 입력하세요…"
                className="ai-input"
                rows={2}
              />
              <button type="submit" className="toolbar-btn accent" disabled={!newComment.trim()}>
                Post
              </button>
            </form>
          ) : (
            <p className="comment-sign-in">
              <Link href="/" className="text-accent">Sign in</Link> to leave a comment.
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
