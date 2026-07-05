'use client';

import { useEffect, useState } from 'react';

interface FeedbackComment {
  id: string;
  text: string;
  createdAt: number;
}

interface Props {
  shareId: string;
}

export function ShareFeedback({ shareId }: Props) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${shareId}/comments`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setComments(data?.comments ?? []))
      .catch(() => setComments([]));
  }, [shareId]);

  async function submitComment() {
    const text = draft.trim();
    if (!text) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/share/${shareId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Failed to save comment');
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setDraft('');
    } finally {
      setSaving(false);
    }
  }

  async function summarizeFeedback() {
    if (comments.length === 0) return;

    setSummarizing(true);
    try {
      const res = await fetch('/api/ai/feedback-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) throw new Error('Failed to summarize feedback');
      const data = await res.json();
      setSummary(data.summary ?? null);
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <aside className="w-80 border-l-2 border-[var(--ink)] bg-[var(--surface)] flex flex-col pointer-events-auto">
      <div className="p-4 border-b-2 border-[var(--ink)]">
        <p className="text-xs uppercase tracking-widest text-[var(--pencil)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Feedback
        </p>
        <h2 className="font-display text-2xl uppercase text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          Board notes
        </h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--pencil)]" style={{ fontFamily: 'var(--font-body)' }}>
            No feedback yet.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border border-[var(--ink)] bg-[var(--paper)] p-3">
              <p className="text-sm text-[var(--ink)] whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>
                {comment.text}
              </p>
              <p className="text-[10px] text-[var(--pencil)] mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
                {new Date(comment.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}

        {summary && (
          <div className="border-2 border-[var(--riso-blue)] bg-[var(--surface-2)] p-3 shadow-riso-sm-blue">
            <p className="text-[10px] uppercase tracking-widest text-[var(--pencil)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              AI summary
            </p>
            <p className="text-sm text-[var(--ink)]" style={{ fontFamily: 'var(--font-body)' }}>
              {summary}
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t-2 border-[var(--ink)] space-y-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Leave feedback..."
          className="w-full h-24 resize-none border-2 border-[var(--ink)] bg-transparent px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <div className="flex gap-2">
          <button
            onClick={submitComment}
            disabled={saving || !draft.trim()}
            className="flex-1 border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-3 py-2 text-xs font-semibold uppercase tracking-wider disabled:opacity-40"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {saving ? 'Saving' : 'Post'}
          </button>
          <button
            onClick={summarizeFeedback}
            disabled={summarizing || comments.length === 0}
            className="flex-1 border-2 border-[var(--ink)] text-[var(--ink)] px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:opacity-40"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {summarizing ? '...' : 'Summarize'}
          </button>
        </div>
      </div>
    </aside>
  );
}
