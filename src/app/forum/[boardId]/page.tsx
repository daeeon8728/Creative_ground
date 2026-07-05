'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllBoards } from '@/lib/db';
import type { ForumBoard, ForumPost } from '@/lib/forum';
import type { BoardData } from '@/lib/types';
import { KIND_META } from '@/lib/types';

export default function ForumBoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;

  const [board, setBoard] = useState<ForumBoard | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [myBoards, setMyBoards] = useState<BoardData[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    // Load board info and posts
    Promise.all([
      fetch('/api/forum/boards').then(r => r.json()),
      fetch(`/api/forum/posts/${boardId}`).then(r => r.json()),
      getAllBoards(),
    ]).then(([boardsData, postsData, userBoards]) => {
      const found = (boardsData.boards ?? []).find((b: ForumBoard) => b.id === boardId);
      setBoard(found ?? null);
      setPosts(postsData.posts ?? []);
      setMyBoards(userBoards);
      setLoading(false);
    });
  }, [boardId]);

  async function handleLike(post: ForumPost) {
    if (!session?.user) return;
    if (likingId) return;
    setLikingId(post.id);
    const res = await fetch('/api/forum/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, boardId }),
    });
    if (res.ok) {
      const { liked, count } = await res.json();
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (liked) next.add(post.id); else next.delete(post.id);
        return next;
      });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likeCount: count } : p));
    }
    setLikingId(null);
  }

  async function handlePost() {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    await fetch(`/api/forum/posts/${boardId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        sharedBoardId: selectedBoard?.id,
        sharedBoardName: selectedBoard?.name,
        sharedBoardKind: selectedBoard?.kind,
      }),
    });
    setSubmitting(false);
    setShowNewPost(false);
    setTitle(''); setContent(''); setSelectedBoard(null);
    // Refresh posts
    const data = await fetch(`/api/forum/posts/${boardId}`).then(r => r.json());
    setPosts(data.posts ?? []);
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-[var(--pencil)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>불러오는 중…</div>;

  return (
    <div className="min-h-dvh bg-[var(--paper)]">
      {/* Header */}
      <header className="border-b-2 border-[var(--ink)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/forum" className="text-sm border-2 border-[var(--ink)] px-3 py-1.5 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            ← 게시판 목록
          </Link>
          <span className="font-display text-xl uppercase tracking-tight text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {board?.emoji} {board?.title ?? boardId}
          </span>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="px-4 py-2 text-sm font-semibold uppercase tracking-wider bg-[var(--ink)] text-[var(--paper)] border-2 border-[var(--ink)] shadow-riso-coral hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--riso-coral)] transition-all"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          + 글쓰기
        </button>
      </header>

      <main className="px-6 py-10 max-w-3xl mx-auto">
        {board?.description && (
          <p className="text-sm text-[var(--pencil)] mb-6 border-l-4 border-[var(--riso-coral)] pl-4" style={{ fontFamily: 'var(--font-body)' }}>
            {board.description}
          </p>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-sm text-[var(--pencil)]" style={{ fontFamily: 'var(--font-body)' }}>아직 게시글이 없어요. 첫 번째 글을 남겨보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-2 border-[var(--ink)] bg-[var(--surface)] p-5 hover:shadow-riso-sm-coral transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg uppercase text-[var(--ink)] truncate" style={{ fontFamily: 'var(--font-display)' }}>
                      {post.title}
                    </h3>
                    <p className="text-xs text-[var(--pencil)] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                      {post.authorName} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                  {post.content.length > 200 ? post.content.slice(0, 200) + '…' : post.content}
                </p>

                {/* Shared board preview */}
                {post.sharedBoardId && post.sharedBoardName && (
                  <Link href={`/share/${post.sharedBoardId}`} className="block mt-2 mb-3">
                    <div className="flex items-center gap-2 border border-[var(--ink)] bg-[var(--surface-2)] px-3 py-2 text-xs hover:bg-[var(--riso-yellow)]/20 transition-colors">
                      <span>{post.sharedBoardKind ? KIND_META[post.sharedBoardKind].emoji : '📋'}</span>
                      <span className="text-[var(--ink)] font-semibold" style={{ fontFamily: 'var(--font-body)' }}>공유된 보드: {post.sharedBoardName}</span>
                      <span className="text-[var(--pencil)] ml-auto">↗</span>
                    </div>
                  </Link>
                )}

                {/* Like */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => handleLike(post)}
                    disabled={likingId === post.id || !session?.user}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1 border-2 transition-all ${likedPosts.has(post.id) ? 'border-[var(--riso-coral)] bg-[var(--riso-coral)]/10 text-[var(--riso-coral)]' : 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--riso-coral)]/10 hover:border-[var(--riso-coral)]'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span>{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                    <span>{post.likeCount}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--ink)]/60 backdrop-blur-sm"
              onClick={() => setShowNewPost(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="relative bg-[var(--surface)] border-2 border-[var(--ink)] shadow-riso-coral w-full max-w-xl p-8 my-auto"
            >
              <h2 className="font-display text-2xl uppercase text-[var(--ink)] mb-6" style={{ fontFamily: 'var(--font-display)' }}>글 쓰기</h2>

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>제목 *</span>
                  <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
                    className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[var(--riso-coral)]"
                    style={{ fontFamily: 'var(--font-body)' }} placeholder="제목을 입력하세요"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>내용 *</span>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[var(--riso-coral)] resize-none h-32"
                    style={{ fontFamily: 'var(--font-body)' }} placeholder="내용을 입력하세요"
                  />
                </label>

                {/* Share a board */}
                {myBoards.length > 0 && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>내 보드 공유 (선택사항)</span>
                    <select
                      value={selectedBoard?.id ?? ''}
                      onChange={e => {
                        const b = myBoards.find(b => b.id === e.target.value);
                        setSelectedBoard(b ?? null);
                      }}
                      className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-coral)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <option value="">— 보드를 선택하세요 —</option>
                      {myBoards.map(b => (
                        <option key={b.id} value={b.id}>{KIND_META[b.kind].emoji} {b.name}</option>
                      ))}
                    </select>
                    {selectedBoard && (
                      <p className="text-xs text-[var(--pencil)] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                        ✓ &quot;{selectedBoard.name}&quot; 보드가 공유됩니다
                      </p>
                    )}
                  </label>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handlePost} disabled={submitting || !title.trim() || !content.trim()}
                  className="flex-1 py-3 font-semibold uppercase tracking-wider text-sm bg-[var(--ink)] text-[var(--paper)] border-2 border-[var(--ink)] disabled:opacity-50 hover:shadow-riso-coral hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {submitting ? '올리는 중…' : '글 올리기'}
                </button>
                <button
                  onClick={() => setShowNewPost(false)}
                  className="px-4 py-3 font-semibold text-sm border-2 border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  취소
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
