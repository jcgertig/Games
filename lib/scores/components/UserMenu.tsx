'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useScoresClient, useTriggerAuth } from './AuthModalProvider';
import { validateDisplayNameFormat, DISPLAY_NAME_MAX } from '@/lib/display-name';

// ── Edit display-name modal ───────────────────────────────────────────────────

function EditNameModal({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const client = useScoresClient();
  const [value, setValue] = useState(current);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const check = validateDisplayNameFormat(value);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setLoading(true);
    try {
      const saved = await client.updateDisplayName(check.name);
      // Refresh the Supabase session so user_metadata is current everywhere
      await client.getSupabaseClient().auth.refreshSession();
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">Display Name</h2>
        <p className="text-slate-400 text-sm mb-5">
          This is the name shown on leaderboards. Max {DISPLAY_NAME_MAX} characters.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            maxLength={DISPLAY_NAME_MAX}
            placeholder="Your name"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={loading || value.trim() === current}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── User menu (header island) ─────────────────────────────────────────────────

export function UserMenu() {
  const client = useScoresClient();
  const triggerAuth = useTriggerAuth();
  const supabase = client.getSupabaseClient();

  const [session, setSession] = useState<Session | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!session) {
    return (
      <button
        onClick={() => triggerAuth()}
        className="text-sm text-slate-400 hover:text-white transition-colors"
      >
        Sign In
      </button>
    );
  }

  const displayName =
    session.user.user_metadata?.display_name ??
    session.user.email?.split('@')[0] ??
    'Player';

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
          title="Edit display name"
        >
          <span>{displayName}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sign out
        </button>
      </div>

      {showEdit && (
        <EditNameModal
          current={displayName}
          onSave={() => setShowEdit(false)}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
