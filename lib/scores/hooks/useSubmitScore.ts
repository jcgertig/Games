'use client';

import { useState, useCallback } from 'react';
import { getScoresClient } from '../client';
import type { SubmitScoreOptions, SubmitScoreResult } from '../types';

export function useSubmitScore() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitScoreResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async (options: SubmitScoreOptions): Promise<SubmitScoreResult> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await getScoresClient().submitScore(options);
      setLastResult(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submit, isSubmitting, lastResult, error };
}
