# Project Directory & Architecture Guide

## 1. Architectural Principles

This project adheres to **Feature-Driven & Clean Architecture** principles using **Next.js (App Router)** and **TypeScript**:

- **Separation of Concerns**: UI components, state machines, business domain logic, and external API connectors are isolated into dedicated layers.
- **Extensibility**: Adding new training formats (e.g., listening reflex, shadow reading, role-play) or switching AI providers requires zero rewrites of core domain logic.
- **Single Source of Truth**: Shared domain models and TypeScript interfaces reside in `@/types`.
- **Stateless AI Boundary**: The backend evaluation logic is encapsulated inside dedicated service adapters (`src/services/ai`).

---

## 2. Directory Tree

```
english-reflex-app/
├── public/
│   ├── audio/                     # Sound effects (bell, timeout, tick, success)
│   └── icons/                     # Static badges and brand assets
├── src/
│   ├── app/                       # Next.js App Router (Routes & API)
│   │   ├── (practice)/            # Route group for practice flows
│   │   │   └── practice/
│   │   │       ├── page.tsx       # Practice setup & level selection page
│   │   │       └── [level]/
│   │   │           └── page.tsx   # Active 10-turn reflex session arena
│   │   ├── api/
│   │   │   └── evaluate/
│   │   │       └── route.ts       # POST: Batch evaluation endpoint
│   │   ├── favicon.ico
│   │   ├── globals.css            # Tailwind directives and custom animation classes
│   │   ├── layout.tsx             # Root layout with providers & header
│   │   └── page.tsx               # Landing page / Home
│   │
│   ├── components/                # Modular UI Layer
│   │   ├── common/                # Universal UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Badge.tsx
│   │   ├── practice/              # Session-specific components
│   │   │   ├── ArenaHeader.tsx    # Round tracker (e.g., "Sentence 3/10") & Level badge
│   │   │   ├── CountdownTimer.tsx # 10-second animated radial/bar countdown
│   │   │   ├── QuestionPrompt.tsx # Vietnamese sentence display with blur/anti-cheat state
│   │   │   ├── LiveTranscript.tsx # Audio wave pulse and real-time STT text
│   │   │   ├── ControlBar.tsx     # Pause, Resume, Next, and Skip action buttons
│   │   │   └── PauseModal.tsx     # Freeze overlay (Resume, Restart, Quit)
│   │   └── results/               # Post-session summary components
│   │       ├── ScoreCard.tsx      # Overview metrics (Passed, Avg Speed, Accuracy)
│   │       ├── SentenceReview.tsx # Individual sentence breakdown item
│   │       └── ReviewList.tsx     # 10-sentence interactive list
│   │
│   ├── hooks/                     # Custom React Hooks
│   │   ├── useSpeechRecognition.ts# Web Speech API wrapper with pause/restart handling
│   │   ├── useCountdown.ts        # Pausable countdown clock with millisecond precision
│   │   ├── useKeyboardShortcuts.ts# Space (Pause/Resume), Enter (Submit), Esc (Quit)
│   │   └── useReflexSession.ts    # Main session state machine (Active, Paused, Evaluating, Done)
│   │
│   ├── services/                  # External Integrations & Adapters
│   │   ├── ai/
│   │   │   ├── index.ts           # Unified AI evaluation factory
│   │   │   ├── gemini.service.ts  # Google Gemini Flash API implementation
│   │   │   └── groq.service.ts    # Groq (Llama 3) implementation (fallback / toggle)
│   │   └── speech/
│   │       └── web-speech.adapter.ts # Browser SpeechRecognition polyfills & event normalizer
│   │
│   ├── data/                      # Seed Data & Question Banks
│   │   ├── levels.json            # Level metadata (descriptions, target speeds, tags)
│   │   └── sentences/
│   │       ├── a1_a2.json         # Level A1-A2 prompts
│   │       ├── b1.json            # Level B1 prompts
│   │       ├── b2.json            # Level B2 prompts
│   │       └── c1.json            # Level C1 prompts
│   │
│   ├── lib/                       # Utilities and Configurations
│   │   ├── constants.ts           # Max timeout (10s), session length (10), default configs
│   │   ├── env.ts                 # Validated environment variables schema (Zod / t3-env)
│   │   └── utils.ts               # Classnames joiner (`cn`), time formatters
│   │
│   └── types/                     # Shared TypeScript Definitions
│       ├── practice.ts            # PracticeTurn, SessionState, Level types
│       ├── speech.ts              # Speech recognition options, transcripts, error statuses
│       └── evaluation.ts          # Request payload, AI JSON response schema, score criteria
│
├── .env.example                   # Template for GEMINI_API_KEY, GROQ_API_KEY, NEXT_PUBLIC_*
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Core Module Responsibilities

### 3.1 Domain Types (`src/types/`)
- **`practice.ts`**:
  ```typescript
  export type DifficultyLevel = 'A1_A2' | 'B1' | 'B2' | 'C1';

  export interface PracticePrompt {
    id: string;
    level: DifficultyLevel;
    vietnamese: string;
    referenceTranslation?: string;
  }

  export interface CompletedTurn {
    promptId: string;
    vietnamese: string;
    userTranscript: string;
    timeSpentSeconds: number;
  }

  export type SessionStatus = 'ready' | 'practicing' | 'paused' | 'evaluating' | 'completed';
  ```

- **`evaluation.ts`**:
  ```typescript
  export interface EvaluationItemResult {
    id: string;
    isCorrect: boolean;
    score: number;
    nativeVersion: string;
    tip: string;
  }

  export interface BatchEvaluationResponse {
    level: DifficultyLevel;
    results: EvaluationItemResult[];
    overallFeedback?: string;
  }
  ```

### 3.2 State Machine Hook (`src/hooks/useReflexSession.ts`)
Controls the lifecycle of a 10-turn practice session:
1. Keeps index `0 -> 9`.
2. Integrates `useCountdown(10)` and `useSpeechRecognition()`.
3. Coordinates pausing (freezes timer, halts mic, flags modal).
4. Dispatches the batch payload to `/api/evaluate` once turn 9 is completed.

### 3.3 AI Service Layer (`src/services/ai/`)
- Encapsulates direct HTTP calls to Gemini or Groq.
- Uses strict prompt guards with JSON output enforcement.
- **Fail-safe mechanism**: If the primary AI engine fails or times out, the factory automatically delegates to the fallback engine or returns a structured error gracefully.

---

## 4. Scaling Strategy for Future Features

| Future Feature | Implementation Strategy |
| :--- | :--- |
| **User History & Streaks** | Connect Supabase/Prisma inside `src/services/db/`, add `src/app/dashboard/` |
| **Audio Playback for Reviews** | Add `MediaRecorder` hook in `src/hooks/useAudioRecorder.ts` and store blobs locally |
| **Listening Reflex (EN -> VI)** | Add question bank in `src/data/sentences/listening/` without changing `PracticeArena` layout |
| **Custom User Decks** | Add upload / creation route in `src/app/custom-decks/` using existing `PracticePrompt` models |