'use client';

import { useState, useEffect, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type View = 'prompt' | 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  supabase: SupabaseClient;
  onSuccess: () => void;
  onSkip: () => void;
}

export function AuthModal({ isOpen, supabase, onSuccess, onSkip }: AuthModalProps) {
  const [view, setView] = useState<View>('prompt');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset to prompt view whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setView('prompt');
      setEmail('');
      setPassword('');
      setDisplayName('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      onSuccess();
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">

        {/* ── Prompt view ─────────────────────────────────── */}
        {view === 'prompt' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-white">Save your score?</h2>
              <p className="text-slate-400 text-sm mt-1">
                Create a free account to track your best scores and appear on the leaderboard.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setView('login')}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => setView('register')}
                className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
              >
                Create Account
              </button>
              <button
                onClick={onSkip}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Login view ──────────────────────────────────── */}
        {view === 'login' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('prompt')}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Back"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-white">Log In</h2>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {errorMsg && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {loading ? 'Logging in…' : 'Log In'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-500">
              No account?{' '}
              <button
                onClick={() => setView('register')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Create one
              </button>
            </p>
            <button
              onClick={onSkip}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Register view ────────────────────────────────── */}
        {view === 'register' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('prompt')}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Back"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-white">Create Account</h2>
            </div>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {errorMsg && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => setView('login')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Log in
              </button>
            </p>
            <button
              onClick={onSkip}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
