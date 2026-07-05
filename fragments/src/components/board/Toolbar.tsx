'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AI_MODELS, type AiModelId } from '@/lib/ai-models';

interface Props {
  boardName: string;
  totalPrice: number;
  checkedCount: number;
  checklistTotal: number;
  canUndo: boolean;
  canRedo: boolean;
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onShuffle: () => void;
  onExport: () => void;
  onShare: () => void;
  onCommandPalette: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onSuggest?: () => void;
  isSuggesting?: boolean;
  onBudgetCoach?: () => void;
  isBudgetCoaching?: boolean;
  aiModel: AiModelId;
  onAiModelChange: (model: AiModelId) => void;
}

export function Toolbar({
  boardName, totalPrice, checkedCount, checklistTotal,
  canUndo, canRedo, onRename, onUndo, onRedo, onShuffle, onExport, onShare,
  onCommandPalette, focusMode, onToggleFocus,
  onSuggest, isSuggesting, onBudgetCoach, isBudgetCoaching,
  aiModel, onAiModelChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(boardName);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(boardName);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    setEditing(false);
    if (draft.trim()) onRename(draft.trim());
  }

  return (
    <header className="h-14 border-b-2 border-[var(--ink)] bg-[var(--surface)] flex items-center px-4 gap-3 shrink-0 z-50">
      <Link
        href="/boards"
        className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors text-sm"
        title="Back to boards"
      >
        &lt;
      </Link>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="border-b-2 border-[var(--riso-blue)] bg-transparent text-[var(--ink)] font-display text-xl uppercase tracking-tight focus:outline-none min-w-0 flex-1 max-w-xs"
          style={{ fontFamily: 'var(--font-display)' }}
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          className="font-display text-xl uppercase tracking-tight text-[var(--ink)] hover:text-[var(--riso-blue)] transition-colors truncate max-w-xs"
          style={{ fontFamily: 'var(--font-display)' }}
          title="Rename board"
        >
          {boardName}
        </button>
      )}

      <div className="flex-1" />

      {totalPrice > 0 && (
        <div className="flex items-center gap-1">
          <div
            className="px-2 py-1 bg-[var(--riso-yellow)] border border-[var(--ink)] text-xs text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-mono)' }}
            title="Total price"
          >
            {totalPrice.toLocaleString()}
          </div>
          {onBudgetCoach && (
            <button
              onClick={onBudgetCoach}
              disabled={isBudgetCoaching}
              className="px-2 py-1 bg-[var(--surface-2)] border border-[var(--ink)] text-[10px] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:opacity-40 transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              title="Budget coach"
            >
              {isBudgetCoaching ? '...' : 'AI'}
            </button>
          )}
        </div>
      )}

      {checklistTotal > 0 && (
        <div
          className="px-2 py-1 bg-[var(--surface-2)] border border-[var(--ink)] text-xs text-[var(--ink)]"
          style={{ fontFamily: 'var(--font-mono)' }}
          title="Checklist progress"
        >
          {checkedCount}/{checklistTotal}
        </div>
      )}

      <TbBtn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">U</TbBtn>
      <TbBtn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">R</TbBtn>
      <TbBtn onClick={onShuffle} title="Tidy">T</TbBtn>
      <TbBtn onClick={onToggleFocus} title="Focus mode (F)" active={focusMode}>F</TbBtn>
      <TbBtn onClick={onCommandPalette} title="Command palette">K</TbBtn>
      <TbBtn onClick={onShare} title="Share">S</TbBtn>

      <select
        value={aiModel}
        onChange={(e) => onAiModelChange(e.target.value as AiModelId)}
        className="h-8 border-2 border-[var(--ink)] bg-[var(--surface)] px-2 text-[11px] text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-mono)' }}
        title="AI model"
      >
        {(Object.entries(AI_MODELS) as [AiModelId, typeof AI_MODELS[AiModelId]][]).map(([id, model]) => (
          <option key={id} value={id}>{model.label}</option>
        ))}
      </select>

      {onSuggest && (
        <TbBtn onClick={onSuggest} disabled={isSuggesting} title="Suggest missing items with AI">
          {isSuggesting ? '...' : 'AI'}
        </TbBtn>
      )}

      <TbBtn onClick={onExport} title="Export">PNG</TbBtn>
    </header>
  );
}

function TbBtn({ children, onClick, disabled, title, active }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        min-w-8 h-8 px-1 flex items-center justify-center text-xs border-2 transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
        disabled:opacity-30 disabled:cursor-not-allowed
        ${active
          ? 'border-[var(--riso-blue)] bg-[var(--riso-blue)] text-white'
          : 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]'
        }
      `}
    >
      {children}
    </button>
  );
}
