'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { saveBoard } from '@/lib/db';
import { KIND_META, type BoardKind } from '@/lib/types';
import { getStarterItems } from '@/lib/starters';
import { AI_MODELS, DEFAULT_AI_MODEL, type AiModelId } from '@/lib/ai-models';

const KINDS = Object.entries(KIND_META) as [BoardKind, typeof KIND_META[BoardKind]][];

const PROMPT_EXAMPLES: Record<BoardKind, string[]> = {
  home: [
    '20평 원룸, 월넛 가구 중심, 예산 200만원 안에서 따뜻한 거실',
    '아이 있는 집이라 모서리 적고 청소 쉬운 화이트+우드 침실',
  ],
  outfit: [
    '여름 출근룩 5벌, 네이비 재킷과 흰 팬츠를 중심으로',
    '제주 여행 3박4일, 사진 잘 나오는 편한 코디',
  ],
  trip: [
    '부산 2박3일, 맛집보다 바다와 산책 중심, 하루 예산 15만원',
    '도쿄 첫 여행, 쇼핑 40%, 카페 30%, 전시 30%',
  ],
  event: [
    '친구 생일 파티, 8명, 핑크+실버, 케이크와 포토존 중심',
    '작은 전시 오프닝, 차분하지만 기억에 남는 동선과 체크리스트',
  ],
  gift: [
    '30대 남자친구 생일, 예산 20만원, 실용적인 선물 5개 비교',
    '집들이 선물, 5만원 이하, 취향 덜 타고 포장 예쁜 것',
  ],
  freeform: [
    '요즘 끌리는 색, 질감, 문장만 모아서 추상적인 무드보드',
    '새 프로젝트의 첫 느낌: 낯설고 조용하지만 선명한 이미지',
  ],
};

interface Props {
  onClose: () => void;
}

export function PurposePicker({ onClose }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<BoardKind | null>(null);
  const [name, setName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [aiModel, setAiModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [creating, setCreating] = useState(false);
  const examples = selected ? PROMPT_EXAMPLES[selected] : [];

  async function handleCreate() {
    if (!selected) return;
    setCreating(true);

    const id = nanoid(12);
    const meta = KIND_META[selected];
    const boardName = name.trim() || `${meta.label} 보드`;
    let initialItems = getStarterItems(selected);

    if (promptText.trim()) {
      try {
        const res = await fetch('/api/ai/start-board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: selected, prompt: promptText.trim(), modelId: aiModel }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            initialItems = data.items;
          }
        }
      } catch (err) {
        console.error('AI board start failed, using fallback', err);
      }
    }

    await saveBoard({
      id,
      kind: selected,
      name: boardName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: initialItems,
      checkpoints: [{ at: Date.now(), items: initialItems }],
    });

    router.push(`/board/${id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[var(--ink)]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-[var(--surface)] border-2 border-[var(--ink)] shadow-riso-blue w-full max-w-2xl p-8"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] text-sm hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          aria-label="Close"
        >
          x
        </button>

        <h2
          className="font-display text-3xl uppercase text-[var(--ink)] mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          어떤 보드를 만들까요?
        </h2>
        <p className="text-sm text-[var(--pencil)] mb-6" style={{ fontFamily: 'var(--font-body)' }}>
          목적을 고르면 기본 스타터가 채워지고, 설명을 적으면 AI가 더 구체적으로 시작해줍니다.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {KINDS.map(([kind, meta]) => (
            <button
              key={kind}
              id={`kind-${kind}`}
              onClick={() => setSelected(kind)}
              className={`
                flex flex-col gap-1 p-4 border-2 text-left transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
                ${selected === kind
                  ? 'border-[var(--riso-blue)] bg-[var(--riso-blue)]/10 shadow-riso-blue'
                  : 'border-[var(--ink)] hover:border-[var(--riso-blue)] hover:shadow-riso-sm-blue'
                }
              `}
            >
              <span className="text-2xl">{meta.emoji}</span>
              <span
                className="text-sm font-semibold text-[var(--ink)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {meta.label}
              </span>
              <span
                className="text-xs text-[var(--pencil)] leading-tight"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {meta.desc}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6 flex flex-col gap-4"
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                  Board name optional
                </span>
                <input
                  id="board-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${KIND_META[selected].label} 보드`}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--pencil)] uppercase tracking-wide flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)' }}>
                  <span>AI에게 원하는 분위기와 조건 적기</span>
                  <span className="text-[10px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-sm">NVIDIA AI</span>
                </span>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={PROMPT_EXAMPLES[selected][0]}
                  className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)] resize-none h-20"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                  AI model
                </span>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value as AiModelId)}
                  className="border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {(Object.entries(AI_MODELS) as [AiModelId, typeof AI_MODELS[AiModelId]][]).map(([id, model]) => (
                    <option key={id} value={id}>{model.label}</option>
                  ))}
                </select>
              </label>

              <div className="border border-[var(--pencil)]/40 bg-[var(--surface-2)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-[var(--pencil)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  AI prompt examples
                </p>
                <div className="flex flex-col gap-1.5">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPromptText(example)}
                      className="text-left text-xs text-[var(--ink)] hover:text-[var(--riso-blue)] transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          id="create-board-btn"
          onClick={handleCreate}
          disabled={!selected || creating}
          className={`
            w-full py-3 font-semibold uppercase tracking-wider text-sm
            border-2 border-[var(--ink)] transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
            ${selected && !creating
              ? 'bg-[var(--ink)] text-[var(--paper)] shadow-riso-blue hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--riso-blue)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
              : 'bg-[var(--surface-2)] text-[var(--pencil)] cursor-not-allowed'
            }
          `}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {creating ? '만드는 중...' : '보드 만들기'}
        </button>
      </motion.div>
    </div>
  );
}
