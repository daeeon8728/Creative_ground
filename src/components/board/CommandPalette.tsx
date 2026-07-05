'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandAction[];
}

export function CommandPalette({ isOpen, onClose, commands }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        filtered[selectedIndex].action();
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--riso-blue)] overflow-hidden"
      >
        <div className="flex items-center border-b-2 border-[var(--ink)] px-4 py-3">
          <span className="text-[var(--ink)] mr-3">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="명령어 검색..."
            className="flex-1 bg-transparent text-lg text-[var(--ink)] focus:outline-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[var(--pencil)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
              결과 없음
            </div>
          ) : (
            <div className="py-2">
              {filtered.map((c, i) => (
                <div
                  key={c.id}
                  onPointerEnter={() => setSelectedIndex(i)}
                  onClick={() => { c.action(); onClose(); }}
                  className={`
                    px-4 py-3 flex items-center justify-between cursor-pointer transition-colors
                    ${i === selectedIndex ? 'bg-[var(--riso-blue)] text-white' : 'text-[var(--ink)]'}
                  `}
                >
                  <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>{c.label}</span>
                  {c.shortcut && (
                    <span 
                      className={`text-[10px] uppercase px-1.5 py-0.5 border ${i === selectedIndex ? 'border-white/50 text-white' : 'border-[var(--pencil)] text-[var(--pencil)]'}`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {c.shortcut}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
