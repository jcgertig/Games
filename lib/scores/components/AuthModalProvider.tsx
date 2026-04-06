'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { initScoresClient, type ScoresClient } from '../client';
import { AuthModal } from './AuthModal';
import { getAnonClient } from '@/lib/supabaseClient';

// ── Context ──────────────────────────────────────────────────────────────────

interface AuthModalContextValue {
  client: ScoresClient;
  triggerAuth: () => Promise<'logged_in' | 'skipped'>;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<((v: 'logged_in' | 'skipped') => void) | null>(null);

  const onAuthRequired = useCallback((): Promise<'logged_in' | 'skipped'> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  // Initialise the singleton once. The ref ensures we only call initScoresClient once
  // even in strict mode double-renders.
  const clientRef = useRef<ScoresClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = initScoresClient({
      supabaseUrl:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseClient:  getAnonClient(),
      onAuthRequired,
    });
  }
  const client = clientRef.current;

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.('logged_in');
  }, []);

  const handleSkip = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.('skipped');
  }, []);

  return (
    <AuthModalContext.Provider value={{ client, triggerAuth: onAuthRequired }}>
      {children}
      <AuthModal
        isOpen={isOpen}
        supabase={client.getSupabaseClient()}
        onSuccess={handleSuccess}
        onSkip={handleSkip}
      />
    </AuthModalContext.Provider>
  );
}

// ── Consumer hooks ────────────────────────────────────────────────────────────

export function useScoresClient(): ScoresClient {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useScoresClient must be used inside <AuthModalProvider>');
  return ctx.client;
}

export function useTriggerAuth(): () => Promise<'logged_in' | 'skipped'> {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useTriggerAuth must be used inside <AuthModalProvider>');
  return ctx.triggerAuth;
}
