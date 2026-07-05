'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { ForumBoard } from '@/lib/forum';

export default function ForumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [boards, setBoards] = useState<ForumBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqEmoji, setReqEmoji] = useState('📌');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/forum/boards').then(r => r.json()).then(d => {
      setBoards(d.boards ?? []);
      setLoading(false);
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRequest() {
    if (!reqTitle.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/forum/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: reqTitle, description: reqDesc, emoji: reqEmoji }),
    });
    setSubmitting(false);
    if (res.ok) {
      showToast('게시판 개설 신청이 완료되었습니다! 관리자의 승인을 기다려주세요.');
      setShowRequestModal(false);
      setReqTitle(''); setReqDesc(''); setReqEmoji('📌');
    }
  }

  async function handleAdminCreate() {
    if (!reqTitle.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/forum/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: reqTitle, description: reqDesc, emoji: reqEmoji }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setBoards(prev => [data.board, ...prev]);
      showToast('게시판이 생성되었습니다!');
      setShowCreateModal(false);
      setReqTitle(''); setReqDesc(''); setReqEmoji('📌');
    }
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="min-h-dvh bg-[var(--paper)]">
      {/* Header */}
      <header className="border-b-2 border-[var(--ink)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/boards" className="text-sm border-2 border-[var(--ink)] px-3 py-1.5 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            ← 내 보드
          </Link>
          <span className="font-display text-2xl uppercase tracking-tight text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            Community
          </span>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider bg-[var(--ink)] text-[var(--paper)] border-2 border-[var(--ink)] shadow-riso-blue hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--riso-blue)] transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              + 게시판 만들기
            </button>
          ) : (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider border-2 border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              게시판 개설 신청
            </button>
          )}
        </div>
      </header>

      <main className="px-6 py-10 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs uppercase tracking-widest text-[var(--pencil)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>커뮤니티</p>
          <h1 className="font-display text-5xl uppercase text-[var(--ink)] mb-8" style={{ fontFamily: 'var(--font-display)' }}>게시판</h1>
        </motion.div>

        {loading ? (
          <p className="text-sm text-[var(--pencil)]" style={{ fontFamily: 'var(--font-mono)' }}>불러오는 중…</p>
        ) : boards.length === 0 ? (
          <div className="border-2 border-[var(--ink)] p-12 text-center shadow-riso-yellow max-w-sm mx-auto">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-display text-2xl uppercase text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>아직 게시판이 없어요</p>
            <p className="text-sm text-[var(--pencil)]" style={{ fontFamily: 'var(--font-body)' }}>
              {isAdmin ? '게시판을 만들어보세요!' : '관리자에게 게시판 개설을 신청해보세요!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board, i) => (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={`/forum/${board.id}`} className="block group">
                  <div className="border-2 border-[var(--ink)] bg-[var(--surface)] overflow-hidden transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] shadow-[4px_4px_0_var(--riso-coral)] group-hover:shadow-[6px_6px_0_var(--riso-coral)]">
                    <div className="h-24 flex items-center justify-center bg-[var(--surface-2)]">
                      <span className="text-5xl">{board.emoji}</span>
                    </div>
                    <div className="p-4 border-t-2 border-[var(--ink)]">
                      <p className="font-display text-lg uppercase text-[var(--ink)] truncate" style={{ fontFamily: 'var(--font-display)' }}>{board.title}</p>
                      {board.description && (
                        <p className="text-xs text-[var(--pencil)] mt-1 line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>{board.description}</p>
                      )}
                      <p className="text-xs text-[var(--pencil)] mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
                        게시글 {board.postCount ?? 0}개
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Request / Create Board Modal */}
      <AnimatePresence>
        {(showRequestModal || showCreateModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--ink)]/60 backdrop-blur-sm"
              onClick={() => { setShowRequestModal(false); setShowCreateModal(false); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="relative bg-[var(--surface)] border-2 border-[var(--ink)] shadow-riso-blue w-full max-w-md p-8"
            >
              <h2 className="font-display text-2xl uppercase text-[var(--ink)] mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                {showCreateModal ? '게시판 만들기' : '게시판 개설 신청'}
              </h2>

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>이모지</span>
                  <input value={reqEmoji} onChange={e => setReqEmoji(e.target.value)}
                    className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-2xl focus:outline-none focus:border-[var(--riso-blue)] w-20"
                    maxLength={2}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>제목 *</span>
                  <input value={reqTitle} onChange={e => setReqTitle(e.target.value)}
                    placeholder="게시판 제목"
                    className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>설명</span>
                  <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)}
                    placeholder="게시판에 대한 설명을 적어주세요"
                    className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)] resize-none h-20"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                </label>
              </div>

              <button
                onClick={showCreateModal ? handleAdminCreate : handleRequest}
                disabled={submitting || !reqTitle.trim()}
                className="mt-6 w-full py-3 font-semibold uppercase tracking-wider text-sm bg-[var(--ink)] text-[var(--paper)] border-2 border-[var(--ink)] disabled:opacity-50 hover:shadow-riso-blue hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {submitting ? '처리 중…' : showCreateModal ? '만들기' : '신청하기'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--ink)] text-[var(--paper)] px-5 py-3 text-sm border-2 border-[var(--riso-blue)] shadow-riso-blue"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
