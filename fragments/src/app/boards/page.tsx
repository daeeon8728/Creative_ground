"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PurposePicker } from "@/components/PurposePicker";
import { getAllBoards, deleteBoard } from "@/lib/db";
import { KIND_META, type BoardData } from "@/lib/types";
import { getWeeklyPrompt } from "@/lib/actions";

// ─── Nudge logic ──────────────────────────────────────────────
function getNudge(board: BoardData): string {
  const daysSince = Math.floor((Date.now() - board.updatedAt) / (1000 * 60 * 60 * 24));
  const totalItems = board.items.length;
  const checkedCount = board.items.filter(i => i.checked).length;
  const unchecked = board.items.filter(i => i.checked === false || (i.price !== undefined && !i.checked));

  if (totalItems === 0) return "비어있음 — 시작해보세요";
  if (daysSince >= 14 && unchecked.length > 0)
    return `${daysSince}일 전 — 아직 ${unchecked.length}개 남음`;
  if (board.items.some(i => i.checked !== undefined)) {
    const total = board.items.filter(i => i.checked !== undefined).length;
    return `${checkedCount} / ${total} 완료`;
  }
  if (daysSince === 0) return "오늘 작업함";
  if (daysSince === 1) return "어제 작업함";
  return `${daysSince}일 전`;
}

// ─── Board cover accent color ─────────────────────────────────
function getCoverColor(board: BoardData): string {
  return KIND_META[board.kind].accent;
}

export default function BoardsPage() {
  const { data: session } = useSession();
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promptStr, setPromptStr] = useState("불러오는 중...");

  // Drag and drop deletion state
  const [draggingBoard, setDraggingBoard] = useState<BoardData | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<BoardData | null>(null);

  useEffect(() => {
    getAllBoards().then(b => {
      setBoards(b);
      setLoading(false);
    });
    getWeeklyPrompt().then(p => setPromptStr(p)).catch(() => setPromptStr("이번 주 테마를 불러오지 못했습니다."));
  }, [showPicker]); // refresh after picker closes

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Navbar */}
      <header className="border-b-2 border-[var(--ink)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <span
          className="font-display text-2xl uppercase tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Fragments
        </span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user?.role === "admin" && (
            <Link
              href="/admin"
              className="px-3 py-1.5 text-sm border-2 border-[var(--ink)] bg-[var(--riso-yellow)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Admin
            </Link>
          )}
          <span
            className="text-xs text-[var(--pencil)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {session?.user?.name}
          </span>
          <button
            id="sign-out-btn"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-3 py-1.5 text-sm border-2 border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex items-end justify-between gap-4"
        >
          <div>
            <p
              className="text-xs uppercase tracking-widest text-[var(--pencil)] mb-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              내 보드
            </p>
            <h1
              className="font-display text-5xl uppercase text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {session?.user?.name?.split(" ")[0] ?? ""}님의 보드
            </h1>
          </div>
          <button
            id="new-board-btn"
            onClick={() => setShowPicker(true)}
            className="
              shrink-0 px-5 py-3 font-semibold text-sm uppercase tracking-wider
              bg-[var(--ink)] text-[var(--paper)] border-2 border-[var(--ink)]
              shadow-riso-blue
              hover:translate-x-[-2px] hover:translate-y-[-2px]
              hover:shadow-[6px_6px_0_var(--riso-blue)]
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
            "
            style={{ fontFamily: "var(--font-body)" }}
          >
            + 새 보드
          </button>
        </motion.div>

        {/* Weekly prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 border-2 border-[var(--pencil)] bg-[var(--surface-2)] px-5 py-3 flex items-start gap-3"
        >
          <span className="text-lg mt-0.5">✦</span>
          <div>
            <p
              className="text-xs text-[var(--pencil)] uppercase tracking-widest mb-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              이번 주 창의 프롬프트
            </p>
            <p
              className="text-sm text-[var(--ink)]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {promptStr}
            </p>
          </div>
        </motion.div>

        {/* Board grid */}
        {loading ? (
          <div className="text-sm text-[var(--pencil)]" style={{ fontFamily: "var(--font-mono)" }}>
            불러오는 중…
          </div>
        ) : boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="border-2 border-[var(--ink)] bg-[var(--surface)] px-10 py-12 shadow-riso-yellow max-w-sm w-full">
              <div className="text-5xl mb-4">✦</div>
              <p
                className="font-display text-2xl uppercase text-[var(--ink)] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                첫 보드를 만들어보세요
              </p>
              <p
                className="text-sm text-[var(--pencil)] leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                방 꾸미기, 여행 계획, 옷장 정리 — 뭐든 시작해보세요
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {boards.map((board, i) => (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <BoardCard 
                  board={board} 
                  onDragStart={() => setDraggingBoard(board)}
                  onDragEnd={() => setDraggingBoard(null)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Purpose picker modal */}
      <AnimatePresence>
        {showPicker && <PurposePicker onClose={() => setShowPicker(false)} />}
      </AnimatePresence>

      {/* Trash Zone */}
      <AnimatePresence>
        {draggingBoard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center"
            style={{ width: 80, height: 80 }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isOverTrash) setIsOverTrash(true);
            }}
            onDragLeave={() => setIsOverTrash(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsOverTrash(false);
              setBoardToDelete(draggingBoard);
            }}
          >
            <motion.div
              animate={isOverTrash ? { rotate: [-10, 10, -10, 10, -10, 10, 0] } : {}}
              transition={{ repeat: isOverTrash ? Infinity : 0, duration: 0.5 }}
              className={`flex items-center justify-center w-full h-full rounded-full border-2 border-[var(--ink)] transition-colors ${
                isOverTrash ? "bg-[var(--riso-coral)] text-[var(--paper)]" : "bg-[var(--surface-2)] text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]"
              }`}
            >
              <span className="text-3xl">🗑️</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {boardToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--ink)]/60 backdrop-blur-sm"
              onClick={() => setBoardToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--riso-coral)] p-8 max-w-sm w-full"
            >
              <h2 className="font-display text-2xl uppercase text-[var(--ink)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
                정말로 삭제하시겠습니까?
              </h2>
              <p className="text-sm text-[var(--pencil)] mb-6" style={{ fontFamily: "var(--font-body)" }}>
                "{boardToDelete.name}" 보드를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await deleteBoard(boardToDelete.id);
                    setBoards(b => b.filter(x => x.id !== boardToDelete.id));
                    setBoardToDelete(null);
                  }}
                  className="flex-1 py-3 font-semibold text-sm bg-[var(--riso-coral)] text-[var(--paper)] border-2 border-[var(--ink)] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--ink)] transition-all"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  삭제하기
                </button>
                <button
                  onClick={() => setBoardToDelete(null)}
                  className="flex-1 py-3 font-semibold text-sm bg-[var(--surface)] text-[var(--ink)] border-2 border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-all"
                  style={{ fontFamily: "var(--font-body)" }}
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

function BoardCard({ board, onDragStart, onDragEnd }: { board: BoardData, onDragStart: () => void, onDragEnd: () => void }) {
  const accent = getCoverColor(board);
  const nudge = getNudge(board);
  const meta = KIND_META[board.kind];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", board.id);
        e.dataTransfer.effectAllowed = "move";
        // 약간의 딜레이 후 드래그 상태를 켜야 고스트 이미지가 제대로 보임
        setTimeout(onDragStart, 0);
      }}
      onDragEnd={onDragEnd}
      className="block group cursor-grab active:cursor-grabbing"
    >
      <Link href={`/board/${board.id}`} id={`board-card-${board.id}`} className="block">
        <div
          className="border-2 border-[var(--ink)] overflow-hidden transition-all duration-150 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px]"
          style={{ boxShadow: `4px 4px 0 ${accent}` }}
        >
          {/* Cover */}
          <div
            className="h-36 flex items-center justify-center"
            style={{ background: `${accent}33` }}
          >
            <span className="text-5xl pointer-events-none">{meta.emoji}</span>
          </div>

          {/* Info */}
          <div className="bg-[var(--surface)] p-4 border-t-2 border-[var(--ink)] pointer-events-none">
            <p
              className="font-display text-lg uppercase text-[var(--ink)] truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {board.name}
            </p>
            <p
              className="text-xs text-[var(--pencil)] mt-0.5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {nudge}
            </p>
            <p
              className="text-xs text-[var(--pencil)] mt-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {board.items.length}개 아이템
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
