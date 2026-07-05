'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvas } from '@/hooks/useCanvas';
import { Toolbar } from './Toolbar';
import { Dock } from './Dock';
import { CanvasArea } from './CanvasArea';
import { CommandPalette, type CommandAction } from './CommandPalette';
import { TimeLapseScrubber } from './TimeLapseScrubber';
import type { CanvasItem, ShapeType } from '@/lib/types';
import { DEFAULT_AI_MODEL, type AiModelId } from '@/lib/ai-models';

interface Props {
  boardId: string;
}

export function BoardCanvas({ boardId }: Props) {
  const canvas = useCanvas(boardId);
  const [focusMode, setFocusMode] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState<number | null>(null);
  const [drawColor, setDrawColor] = useState('#1c1a17');
  const [drawWidth, setDrawWidth] = useState(3);
  const [shapeType, setShapeType] = useState<ShapeType>('rect');
  const [shapeStyle, setShapeStyle] = useState<Partial<CanvasItem>>({
    fillColor: 'var(--riso-yellow)',
    strokeColor: 'var(--ink)',
    strokeWidth: 2,
    strokeDash: 'solid',
    cornerRadius: 0,
  });
  const [aiModel, setAiModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [isSharing, setIsSharing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isBudgetCoaching, setIsBudgetCoaching] = useState(false);
  const [budgetComment, setBudgetComment] = useState<string | null>(null);
  const [weeklyPrompt, setWeeklyPrompt] = useState<string | null>(null);
  const [weeklyPromptDismissed, setWeeklyPromptDismissed] = useState(false);
  const [promptClock] = useState(() => Date.now());
  const boardName = canvas.board?.name ?? 'board';
  const cachedWeeklyPrompt = canvas.board?.aiPromptUpdatedAt && promptClock - canvas.board.aiPromptUpdatedAt < 7 * 24 * 60 * 60 * 1000
    ? canvas.board.aiPrompt ?? null
    : null;
  const displayedWeeklyPrompt = weeklyPrompt ?? cachedWeeklyPrompt;

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      
      // Focus mode
      if (e.key === 'f' || e.key === 'F') setFocusMode(f => !f);
      
      // Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleAddShape = useCallback((shape: ShapeType) => {
    canvas.addShapeItem(shape, 200, 200, shapeStyle);
  }, [canvas, shapeStyle]);

  const handleExport = useCallback(async () => {
    try {
      const { toPng } = await import('html-to-image');
      const canvas_el = document.querySelector('[data-canvas-root]') as HTMLElement || document.querySelector('.relative.bg-\\[var\\(--paper\\)\\]');
      if (!canvas_el) return;
      const dataUrl = await toPng(canvas_el, { cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${boardName}.png`;
      a.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  }, [boardName]);

  const handleStoryExport = useCallback(async () => {
    try {
      const { toPng } = await import('html-to-image');
      const canvas_el = document.querySelector('.relative') as HTMLElement; // canvas container
      if (!canvas_el) return;
      // Force a 9:16 aspect ratio box starting from top-left (or a fixed 1080x1920)
      const dataUrl = await toPng(canvas_el, {
        cacheBust: true,
        width: 1080,
        height: 1920,
        style: { width: '1080px', height: '1920px', overflow: 'hidden' }
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${boardName}-story.png`;
      a.click();
    } catch (err) {
      console.error('Story export failed', err);
    }
  }, [boardName]);

  const handleShare = useCallback(async () => {
    if (!canvas.board) return;
    setIsSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: { ...canvas.board, checkpoints: [] } }),
      });
      if (!res.ok) throw new Error('Share failed');
      const { shareId } = await res.json();
      const url = `${window.location.origin}/share/${shareId}`;
      await navigator.clipboard.writeText(url);
      alert('공유 링크가 클립보드에 복사되었습니다!\n' + url);
    } catch (err) {
      console.error(err);
      alert('공유에 실패했습니다.');
    } finally {
      setIsSharing(false);
    }
  }, [canvas.board]);

  useEffect(() => {
    if (!canvas.board || canvas.board.kind !== 'freeform' || weeklyPromptDismissed) return;

    const now = Date.now();
    const cachedPrompt = canvas.board.aiPrompt;
    const cachedAt = canvas.board.aiPromptUpdatedAt ?? 0;
    const isFresh = cachedPrompt && now - cachedAt < 7 * 24 * 60 * 60 * 1000;

    if (isFresh) return;

    let cancelled = false;
    fetch('/api/ai/weekly-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: canvas.items, kind: canvas.board.kind, modelId: aiModel }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data?.prompt) return;
        setWeeklyPrompt(data.prompt);
        canvas.updateBoardMeta({ aiPrompt: data.prompt, aiPromptUpdatedAt: Date.now() });
      })
      .catch(() => {
        // Fallback is handled by the route; ignore network failures silently.
      });

    return () => {
      cancelled = true;
    };
  }, [canvas, weeklyPromptDismissed, aiModel]);

  const handleSuggest = useCallback(async () => {
    if (!canvas.board || canvas.items.length === 0) {
      alert('아이템을 먼저 추가해주세요!');
      return;
    }
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: canvas.items, kind: canvas.board.kind, modelId: aiModel }),
      });
      if (!res.ok) throw new Error('Suggest failed');
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        (data.items as CanvasItem[]).forEach((item) => canvas.addRawItem(item));
      } else {
        alert('추천할 아이템이 없습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('아이템 추천에 실패했습니다.');
    } finally {
      setIsSuggesting(false);
    }
  }, [canvas, aiModel]);

  const handleBudgetCoach = useCallback(async () => {
    if (!canvas.board) return;
    setIsBudgetCoaching(true);
    try {
      const res = await fetch('/api/ai/budget-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: canvas.items, kind: canvas.board.kind, modelId: aiModel }),
      });
      if (!res.ok) throw new Error('Budget coach failed');
      const data = await res.json();
      setBudgetComment(data.comment ?? null);
    } catch (err) {
      console.error(err);
      setBudgetComment('Add a few prices and try the budget coach again.');
    } finally {
      setIsBudgetCoaching(false);
    }
  }, [canvas, aiModel]);

  const commands: CommandAction[] = [
    { id: 'focus', label: '포커스 모드 토글', shortcut: 'F', action: () => setFocusMode(f => !f) },
    { id: 'shuffle', label: '아이템 줄 세우기 (정렬)', action: canvas.shuffle },
    { id: 'export-png', label: '전체 캔버스 PNG 내보내기', action: handleExport },
    { id: 'timelapse', label: '타임랩스 보기', action: () => {
        if (canvas.board?.checkpoints && canvas.board.checkpoints.length > 0) {
          setTimelapseIndex(canvas.board.checkpoints.length - 1);
        } else {
          alert('아직 저장된 체크포인트가 없습니다.');
        }
    }},
    { id: 'share', label: '보드 공유하기', action: handleShare },
    { id: 'dash', label: '대시보드로 돌아가기', action: () => window.location.href = '/boards' },
  ];

  if (!canvas.board) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--paper)]">
        <div className="text-[var(--pencil)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          보드를 불러오는 중…
        </div>
      </div>
    );
  }

  const hideChrome = focusMode || timelapseIndex !== null;
  const activeItems = timelapseIndex !== null && canvas.board.checkpoints
    ? canvas.board.checkpoints[timelapseIndex].items
    : canvas.items;

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[var(--paper)]">
      <AnimatePresence>
        {!hideChrome && (
          <motion.div
            key="toolbar"
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Toolbar
              boardName={canvas.board.name}
              totalPrice={canvas.totalPrice}
              checkedCount={canvas.checkedCount}
              checklistTotal={canvas.checklistTotal}
              canUndo={canvas.canUndo}
              canRedo={canvas.canRedo}
              onRename={canvas.setBoardName}
              onUndo={canvas.undo}
              onRedo={canvas.redo}
              onShuffle={canvas.shuffle}
              onExport={handleExport}
              onShare={handleShare}
              onCommandPalette={() => setCmdOpen(true)}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode(f => !f)}
              onSuggest={handleSuggest}
              isSuggesting={isSuggesting}
              onBudgetCoach={handleBudgetCoach}
              isBudgetCoaching={isBudgetCoaching}
              aiModel={aiModel}
              onAiModelChange={setAiModel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-h-0 relative">
        <AnimatePresence>
          {!hideChrome && displayedWeeklyPrompt && !weeklyPromptDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-4 left-20 z-40 max-w-sm border-2 border-[var(--ink)] bg-[var(--surface)] shadow-riso-yellow px-4 py-3"
            >
              <button
                onClick={() => setWeeklyPromptDismissed(true)}
                className="absolute top-1 right-2 text-xs text-[var(--pencil)] hover:text-[var(--ink)]"
                title="Dismiss"
              >
                x
              </button>
              <p className="text-[10px] uppercase tracking-widest text-[var(--pencil)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Weekly AI prompt
              </p>
              <p className="text-sm text-[var(--ink)] pr-3" style={{ fontFamily: 'var(--font-body)' }}>
                {displayedWeeklyPrompt}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!hideChrome && budgetComment && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-4 right-4 z-40 max-w-sm border-2 border-[var(--ink)] bg-[var(--surface)] shadow-riso-blue px-4 py-3"
            >
              <button
                onClick={() => setBudgetComment(null)}
                className="absolute top-1 right-2 text-xs text-[var(--pencil)] hover:text-[var(--ink)]"
                title="Dismiss"
              >
                x
              </button>
              <p className="text-[10px] uppercase tracking-widest text-[var(--pencil)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Budget coach
              </p>
              <p className="text-sm text-[var(--ink)] pr-3" style={{ fontFamily: 'var(--font-body)' }}>
                {budgetComment}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!hideChrome && (
            <motion.div
              key="dock"
              initial={{ x: -56, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -56, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Dock
                tool={canvas.tool}
                onSetTool={canvas.setTool}
                onUploadImage={(file) => canvas.addImageItem(file)}
                onAddShape={handleAddShape}
                drawColor={drawColor}
                drawWidth={drawWidth}
                onSetDrawColor={setDrawColor}
                onSetDrawWidth={setDrawWidth}
                shapeType={shapeType}
                onSetShapeType={setShapeType}
                shapeStyle={shapeStyle}
                onSetShapeStyle={(updates) => setShapeStyle((prev) => ({ ...prev, ...updates }))}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focus mode exit hint */}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            className="absolute bottom-4 right-4 z-50 px-3 py-1.5 text-xs border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] opacity-60 hover:opacity-100 transition-opacity"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            [F] 포커스 종료
          </button>
        )}

        {/* Timelapse scrubber */}
        <AnimatePresence>
          {timelapseIndex !== null && canvas.board.checkpoints && (
            <TimeLapseScrubber
              totalFrames={canvas.board.checkpoints.length}
              currentIndex={timelapseIndex}
              onChange={setTimelapseIndex}
              onClose={() => setTimelapseIndex(null)}
            />
          )}
        </AnimatePresence>

        <CanvasArea
          items={activeItems}
          selectedId={canvas.selectedId}
          flippedId={canvas.flippedId}
          imageUrls={canvas.imageUrls}
          tool={canvas.tool}
          onSelect={canvas.selectItem}
          onUpdate={canvas.updateItem}
          onDelete={canvas.deleteSelected}
          onFlip={canvas.flipItem}
          onBringForward={canvas.bringForward}
          onSendBackward={canvas.sendBackward}
          onAddText={canvas.addTextItem}
          onAddShape={(x, y) => canvas.addShapeItem(shapeType, x, y, shapeStyle)}
          onAddDrawing={(path, color, width) => canvas.addDrawingItem(path, color, width)}
          drawColor={drawColor}
          drawWidth={drawWidth}
        />
      </div>

      <AnimatePresence>
        {cmdOpen && (
          <CommandPalette
            isOpen={cmdOpen}
            onClose={() => setCmdOpen(false)}
            commands={commands}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
