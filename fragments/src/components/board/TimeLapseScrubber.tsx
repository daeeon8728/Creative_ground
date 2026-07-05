'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  totalFrames: number;
  currentIndex: number;
  onChange: (index: number) => void;
  onClose: () => void;
}

export function TimeLapseScrubber({ totalFrames, currentIndex, onChange, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying && currentIndex < totalFrames - 1) {
      timerRef.current = setInterval(() => {
        onChange(currentIndex + 1);
      }, 300); // 300ms per frame
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentIndex, totalFrames, onChange]);

  function togglePlay() {
    if (currentIndex >= totalFrames - 1) {
      onChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--riso-blue)] p-4 w-full max-w-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-widest text-[var(--ink)]" style={{ fontFamily: 'var(--font-mono)' }}>
          타임랩스 재생
        </span>
        <button
          onClick={onClose}
          className="text-xs text-[var(--pencil)] hover:text-[var(--ink)] uppercase"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          종료
        </button>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--riso-blue)] text-white hover:bg-[var(--ink)] transition-colors"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentIndex}
          onChange={e => {
            onChange(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="flex-1 accent-[var(--riso-blue)]"
        />

        <span className="text-xs font-bold text-[var(--pencil)] w-8 text-right" style={{ fontFamily: 'var(--font-mono)' }}>
          {currentIndex + 1}/{totalFrames}
        </span>
      </div>
    </motion.div>
  );
}
