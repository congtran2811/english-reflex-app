'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CompletedTurn, DifficultyLevel, PracticePrompt, SessionStatus } from '@/types/practice';
import type {
  BatchEvaluationRequest,
  BatchEvaluationResponse,
  EvaluationErrorResponse,
  EvaluationItemResult,
} from '@/types/evaluation';

export type TurnFeedback =
  | { state: 'loading' }
  | { state: 'done'; result: EvaluationItemResult }
  | { state: 'error'; message: string };
import {
  NO_RESPONSE_PLACEHOLDER,
  TURN_DURATION_OPTIONS,
  TURN_DURATION_SECONDS,
  type TurnDurationOption,
} from '@/lib/constants';
import { getOrGenerateSessionPrompts, pickSessionPrompts, prefetchAIPrompts } from '@/data';
import { resolveTopicPrompt } from '@/lib/topics';
import { autoSaveLowScoreTurn } from '@/lib/mistakes';
import { useCountdown } from './useCountdown';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAudioRecorder } from './useAudioRecorder';

const DURATION_STORAGE_KEY = 'reflex.turnDuration';
const TOPIC_STORAGE_KEY = 'reflex.selectedTopic';
const DIALOGUE_STORAGE_KEY = 'reflex.isDialogueMode';

function getStoredDuration(): TurnDurationOption {
  if (typeof window === 'undefined') return TURN_DURATION_SECONDS;
  const raw = Number(localStorage.getItem(DURATION_STORAGE_KEY));
  return (TURN_DURATION_OPTIONS as readonly number[]).includes(raw)
    ? (raw as TurnDurationOption)
    : TURN_DURATION_SECONDS;
}

function getStoredTopic(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOPIC_STORAGE_KEY) || '';
}

function getStoredDialogueMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DIALOGUE_STORAGE_KEY) === 'true';
}

/**
 * Session state machine: ready → practicing ⇄ paused → evaluating → completed | error.
 * No evaluation happens between turns; all 10 are sent in one batch at the end.
 */
export function useReflexSession(level: DifficultyLevel) {
  const [status, setStatus] = useState<SessionStatus>('ready');
  const [prompts, setPrompts] = useState<PracticePrompt[]>([]);
  const [index, setIndex] = useState(0);
  const [turns, setTurns] = useState<CompletedTurn[]>([]);
  const [evaluation, setEvaluation] = useState<BatchEvaluationResponse | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [turnDuration, setTurnDurationState] = useState<TurnDurationOption>(getStoredDuration);
  const [topicText, setTopicTextState] = useState<string>(getStoredTopic);
  const [isDialogueMode, setIsDialogueModeState] = useState<boolean>(getStoredDialogueMode);
  const [feedback, setFeedback] = useState<Record<number, TurnFeedback>>({});
  const feedbackRef = useRef<Record<number, TurnFeedback>>({});
  const updateFeedback = useCallback((i: number, f: TurnFeedback) => {
    feedbackRef.current = { ...feedbackRef.current, [i]: f };
    setFeedback(feedbackRef.current);
  }, []);

  const turnDurationRef = useRef(turnDuration);
  const setTurnDuration = useCallback((sec: TurnDurationOption) => {
    turnDurationRef.current = sec;
    setTurnDurationState(sec);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DURATION_STORAGE_KEY, String(sec));
    }
  }, []);

  const topicTextRef = useRef(topicText);
  const setTopicText = useCallback((text: string) => {
    topicTextRef.current = text;
    setTopicTextState(text);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOPIC_STORAGE_KEY, text);
    }
  }, []);

  const isDialogueModeRef = useRef(isDialogueMode);
  const setIsDialogueMode = useCallback((val: boolean) => {
    isDialogueModeRef.current = val;
    setIsDialogueModeState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DIALOGUE_STORAGE_KEY, String(val));
    }
  }, []);

  const speech = useSpeechRecognition();
  const recorder = useAudioRecorder();

  // Warm up the AI-generated sentence pool in the background.
  useEffect(() => {
    const promptKeywords = resolveTopicPrompt(topicText);
    const key = topicText.trim() ? topicText.trim().toLowerCase() : 'all';
    void prefetchAIPrompts(level, key, promptKeywords, isDialogueMode);
  }, [level, topicText, isDialogueMode]);

  // Refs keep timer callbacks free of stale closures.
  const statusRef = useRef(status);
  const indexRef = useRef(index);
  const promptsRef = useRef(prompts);
  const turnsRef = useRef<CompletedTurn[]>([]);
  useLayoutEffect(() => {
    statusRef.current = status;
    indexRef.current = index;
    promptsRef.current = prompts;
    turnDurationRef.current = turnDuration;
    topicTextRef.current = topicText;
    isDialogueModeRef.current = isDialogueMode;
  }, [status, index, prompts, turnDuration, topicText, isDialogueMode]);

  const submitRef = useRef<() => void>(() => {});
  const onExpire = useCallback(() => submitRef.current(), []);
  const countdown = useCountdown(turnDuration, onExpire);

  const evaluate = useCallback(
    async (completed: CompletedTurn[]) => {
      setStatus('evaluating');
      setEvalError(null);
      const payload: BatchEvaluationRequest = {
        level,
        sentences: completed.map((t, i) => ({
          id: i + 1,
          vi: t.vietnamese,
          userEn: t.userTranscript,
          referenceEn: t.referenceTranslation,
          partnerQuestion: t.partnerQuestion,
        })),
      };
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as BatchEvaluationResponse | EvaluationErrorResponse;
        if (!res.ok || 'error' in data) {
          throw new Error('error' in data ? data.error : `HTTP ${res.status}`);
        }
        setEvaluation({
          ...data,
          results: data.results.map((r, i) => ({ ...r, id: completed[Number(r.id) - 1]?.promptId ?? completed[i]?.promptId ?? r.id })),
        });
        setStatus('completed');
      } catch (err) {
        setEvalError(err instanceof Error ? err.message : 'Evaluation failed');
        setStatus('error');
      }
    },
    [level],
  );

  /** Evaluate a single turn right away (runs while the user reads the review screen). */
  const evaluateTurn = useCallback(
    async (i: number, turn: CompletedTurn) => {
      updateFeedback(i, { state: 'loading' });
      try {
        const payload: BatchEvaluationRequest = {
          level,
          sentences: [
            {
              id: 1,
              vi: turn.vietnamese,
              userEn: turn.userTranscript,
              referenceEn: turn.referenceTranslation,
              partnerQuestion: turn.partnerQuestion,
            },
          ],
        };
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as BatchEvaluationResponse | EvaluationErrorResponse;
        if (!res.ok || 'error' in data) throw new Error('error' in data ? data.error : `HTTP ${res.status}`);
        const r = data.results[0];
        if (!r) throw new Error('Empty result');
        const doneResult = { ...r, id: turn.promptId };
        updateFeedback(i, { state: 'done', result: doneResult });

        // Auto-save to Mistakes Bank if score is under 70
        autoSaveLowScoreTurn(turn, doneResult, level);
      } catch (err) {
        updateFeedback(i, { state: 'error', message: err instanceof Error ? err.message : 'Evaluation failed' });
      }
    },
    [level, updateFeedback],
  );

  const submitTurn = useCallback(async () => {
    if (statusRef.current !== 'practicing') return;
    const prompt = promptsRef.current[indexRef.current];
    if (!prompt) return;

    countdown.pause();
    const transcript = speech.getTranscript();
    speech.stop();
    speech.resetTranscript();

    // Stop recording and retrieve audio URL for shadowing comparison
    const audioUrl = await recorder.stopRecording();

    const turn: CompletedTurn = {
      promptId: prompt.id,
      vietnamese: prompt.vietnamese,
      userTranscript: transcript || NO_RESPONSE_PLACEHOLDER,
      timeSpentSeconds: Number((turnDurationRef.current - countdown.getTimeLeft()).toFixed(1)),
      firstSpeechLatency: speech.firstSpeechLatency,
      referenceTranslation: prompt.referenceTranslation,
      partnerQuestion: prompt.partnerQuestion,
      audioUrl,
    };
    const next = [...turnsRef.current, turn];
    turnsRef.current = next;
    setTurns(next);

    setStatus('reviewing');
    statusRef.current = 'reviewing';
    void evaluateTurn(indexRef.current, turn);
  }, [countdown, speech, recorder, evaluateTurn]);

  const retryTurnEvaluation = useCallback(() => {
    const i = indexRef.current;
    const turn = turnsRef.current[i];
    if (turn) void evaluateTurn(i, turn);
  }, [evaluateTurn]);

  /** Retry / Shadowing the current turn immediately from the review card */
  const retryCurrentTurn = useCallback(() => {
    if (statusRef.current !== 'reviewing') return;
    // Pop the current turn result from turns history
    const next = turnsRef.current.slice(0, indexRef.current);
    turnsRef.current = next;
    setTurns(next);

    // Clear feedback for this index
    const nextFeedback = { ...feedbackRef.current };
    delete nextFeedback[indexRef.current];
    feedbackRef.current = nextFeedback;
    setFeedback(nextFeedback);

    // Return to practicing state
    setStatus('practicing');
    statusRef.current = 'practicing';
    speech.resetTranscript();
    speech.start();
    void recorder.startRecording();
    countdown.start();
  }, [countdown, speech, recorder]);

  /** Leave the review screen: go to next sentence, or show the final summary. */
  const nextTurn = useCallback(() => {
    if (statusRef.current !== 'reviewing') return;
    if (indexRef.current >= promptsRef.current.length - 1) {
      const all = turnsRef.current;
      const fb = feedbackRef.current;
      const allDone = all.every((_, i) => fb[i]?.state === 'done');
      if (allDone) {
        setEvaluation({
          level,
          results: all.map((_, i) => (fb[i] as Extract<TurnFeedback, { state: 'done' }>).result),
        });
        setStatus('completed');
        statusRef.current = 'completed';
      } else {
        void evaluate(all); // fallback: batch-evaluate anything that failed
      }
      return;
    }
    indexRef.current += 1;
    setIndex(indexRef.current);
    setStatus('practicing');
    statusRef.current = 'practicing';
    speech.resetTranscript();
    speech.start();
    void recorder.startRecording();
    countdown.start();
  }, [countdown, speech, recorder, evaluate, level]);
  useLayoutEffect(() => {
    submitRef.current = submitTurn;
  }, [submitTurn]);

  const begin = useCallback(async () => {
    setIsPreparing(true);
    try {
      const promptKeywords = resolveTopicPrompt(topicTextRef.current);
      const key = topicTextRef.current.trim() ? topicTextRef.current.trim().toLowerCase() : 'all';
      const picked = await getOrGenerateSessionPrompts(
        level,
        10,
        key,
        promptKeywords,
        isDialogueModeRef.current,
      );
      promptsRef.current = picked;
      indexRef.current = 0;
      turnsRef.current = [];
      setPrompts(picked);
      setTurns([]);
      setIndex(0);
      setEvaluation(null);
      setEvalError(null);
      feedbackRef.current = {};
      setFeedback({});
      setStatus('practicing');
      statusRef.current = 'practicing';
      speech.resetTranscript();
      speech.start();
      void recorder.startRecording();
      countdown.start();
    } catch (err) {
      console.error('[begin]', err);
      // Fallback in case of unexpected error
      const fallback = pickSessionPrompts(level, 10, isDialogueModeRef.current);
      promptsRef.current = fallback;
      setPrompts(fallback);
      setStatus('practicing');
      statusRef.current = 'practicing';
      speech.resetTranscript();
      speech.start();
      void recorder.startRecording();
      countdown.start();
    } finally {
      setIsPreparing(false);
    }
  }, [level, speech, recorder, countdown]);

  /** Start a practice session with custom prompts (e.g. from Mistakes Bank) */
  const startCustomPrompts = useCallback((custom: PracticePrompt[]) => {
    if (!custom.length) return;
    promptsRef.current = custom;
    indexRef.current = 0;
    turnsRef.current = [];
    setPrompts(custom);
    setTurns([]);
    setIndex(0);
    setEvaluation(null);
    setEvalError(null);
    feedbackRef.current = {};
    setFeedback({});
    setStatus('practicing');
    statusRef.current = 'practicing';
    speech.resetTranscript();
    speech.start();
    void recorder.startRecording();
    countdown.start();
  }, [speech, recorder, countdown]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'practicing') return;
    countdown.pause();
    speech.stop();
    setStatus('paused');
  }, [countdown, speech]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    setStatus('practicing');
    statusRef.current = 'practicing';
    speech.start();
    countdown.resume();
  }, [countdown, speech]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'practicing') pause();
    else if (statusRef.current === 'paused') resume();
  }, [pause, resume]);

  const restartTurn = useCallback(() => {
    if (statusRef.current !== 'paused' && statusRef.current !== 'practicing') return;
    setStatus('practicing');
    statusRef.current = 'practicing';
    speech.resetTranscript();
    speech.start();
    void recorder.startRecording();
    countdown.start();
  }, [countdown, speech, recorder]);

  const quit = useCallback(() => {
    countdown.reset();
    speech.stop();
    speech.resetTranscript();
    recorder.cancelRecording();
    setTurns([]);
    turnsRef.current = [];
    setIndex(0);
    indexRef.current = 0;
    setStatus('ready');
  }, [countdown, speech, recorder]);

  const retryEvaluation = useCallback(() => {
    if (turnsRef.current.length) void evaluate(turnsRef.current);
  }, [evaluate]);

  return {
    status,
    level,
    prompts,
    index,
    currentPrompt: prompts[index] ?? null,
    total: prompts.length,
    turns,
    evaluation,
    evalError,
    isPreparing,
    feedback,
    currentFeedback: feedback[index] ?? null,
    currentTurn: turns[index] ?? null,
    nextTurn,
    retryTurnEvaluation,
    timeLeft: countdown.timeLeft,
    turnDuration,
    setTurnDuration,
    topicText,
    setTopicText,
    isDialogueMode,
    setIsDialogueMode,
    retryCurrentTurn,
    startCustomPrompts,
    speech,
    begin,
    submitTurn,
    pause,
    resume,
    togglePause,
    restartTurn,
    quit,
    retryEvaluation,
  };
}

export type ReflexSession = ReturnType<typeof useReflexSession>;
