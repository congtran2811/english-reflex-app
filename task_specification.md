# English Reflex Translation App - Implementation Specification

## 1. Project Overview
A web-based English reflex training app designed to help users translate Vietnamese sentences into natural English within a strict 10-second window. The practice runs in batches of 10 sentences. At the end of each session, an AI engine evaluates all 10 responses, marks correctness, and provides native-level revisions.

---

## 2. Core Requirements & Rules

1. **Session Structure**:
   - Each session consists of exactly **10 sentences** based on the chosen difficulty level (A1-A2, B1, B2, C1).
   - Users have **10 seconds** per sentence to speak their English translation.
   - Flow moves automatically to the next sentence when time expires or when the user manually submits.

2. **Speech Recognition (STT)**:
   - Uses browser-native **Web Speech API** (`webkitSpeechRecognition` / `SpeechRecognition`) with `lang: 'en-US'`.
   - Real-time display of speech transcript.
   - Zero server cost for audio transcription.

3. **Pause Functionality**:
   - Allows users to pause at any moment during the 10-second countdown.
   - When paused:
     - The countdown timer freezes (`timeLeft` is preserved).
     - Microphone recording stops immediately.
     - The Vietnamese prompt is blurred (`filter: blur(8px)`) to preserve the reflex challenge and prevent cheating.
     - A pause modal appears offering: **Resume**, **Restart Sentence**, or **Quit Session**.
   - Keyboard shortcut: **Spacebar** or **Esc** toggles Pause/Resume; **Enter** submits early.

4. **Batch AI Evaluation**:
   - No evaluation is made during the 10 sentences to maintain high reflex intensity.
   - After completing sentence #10, the app sends all 10 inputs in a single payload to a free-tier AI API (**Google Gemini** or **Groq / Llama 3**).
   - Response is parsed from strict JSON into a comprehensive summary report.

---

## 3. Tech Stack
- **Framework**: Next.js (App Router) or Vite + React
- **Styling**: Tailwind CSS + Lucide Icons
- **State Management**: React Hooks (`useState`, `useEffect`, `useRef`, `useCallback`)
- **Speech API**: Web Speech Recognition API (`en-US`)
- **AI Backend**: Next.js Route Handler `/api/evaluate` calling Gemini 1.5 Flash or Groq API (free tier)

---

## 4. Implementation Tasks (Checklist for IDE Agent)

### Phase 1: Project Setup & Static Assets
- [ ] Initialize project with Next.js (or Vite + React) and configure Tailwind CSS.
- [ ] Create `data/sentences.json` containing 10-20 sample sentences categorized by levels (`A1_A2`, `B1`, `B2`, `C1`).
- [ ] Set up environment variables (`GEMINI_API_KEY` or `GROQ_API_KEY`) in `.env.local`.

### Phase 2: Speech-to-Text & Practice Engine
- [ ] Create custom hook `useSpeechRecognition.ts`:
  - Initialize `window.SpeechRecognition` / `window.webkitSpeechRecognition`.
  - Handle browser permissions, continuous transcription, error states, and cross-browser fallbacks.
  - Implement `start()`, `stop()`, and `resetTranscript()` controls.
- [ ] Build `PracticeArena.tsx`:
  - 10-second radial or horizontal progress countdown.
  - Visual display of Vietnamese source sentence.
  - Live transcript container with pulse wave / recording indicator.
  - Keyboard listeners for `Space` (Pause/Resume) and `Enter` (Fast Forward/Next).

### Phase 3: Pause & Resume Mechanism
- [ ] Implement pause state:
  - Freeze countdown timer interval without resetting remaining time.
  - Stop microphone recording immediately to prevent recording ambient noise.
  - Apply `blur-md select-none` to the question container.
  - Render `PauseOverlay` component with options: Resume, Restart Sentence, Exit.
- [ ] Implement resume state:
  - Restore remaining time.
  - Re-attach and restart STT instance.

### Phase 4: AI Batch Evaluation Integration
- [ ] Create backend route `app/api/evaluate/route.ts`:
  - Accepts payload: `{ level: string, sessions: [{ id: number, vi: string, userEn: string }] }`.
  - System prompt enforcing strict JSON output (schema defined below).
  - Call Gemini Flash or Groq API.
  - Error handling with fallback parsing in case of invalid JSON formatting.

### Phase 5: Results & Native Polish Dashboard
- [ ] Create `ResultSummary.tsx`:
  - Total score card (e.g., `8/10 Passed`, average reflex duration).
  - Sentence-by-sentence comparison breakdown:
    - Vietnamese source.
    - User's transcript vs. Native English translation.
    - Pass/Fail badge.
    - Concise coach tip on grammar, word choice, or natural idioms.
  - Action buttons: "Try Again", "Choose Another Level", "Review Mistakes".

---

## 5. Data Contracts & Schemas

### 5.1 Batch Evaluation Input Payload (Frontend -> API)
```json
{
  "level": "B1",
  "sentences": [
    {
      "id": 1,
      "vi": "Hôm nay trời mưa to quá nên tôi không muốn đi làm.",
      "userEn": "Today rain very big so I don't want go to work."
    },
    {
      "id": 2,
      "vi": "Bạn có thể giữ chỗ này giúp tôi được không?",
      "userEn": "Can you keep this seat for me?"
    }
  ]
}
```

### 5.2 AI Prompt Template (`app/api/evaluate/route.ts`)
```text
You are a native English language examiner evaluating a Vietnamese-to-English rapid reflex translation drill.

Input data:
{input_json}

Evaluate all items strictly and return ONLY a valid JSON array matching this exact schema:
[
  {
    "id": 1,
    "is_correct": false,
    "score": 40,
    "native_version": "It's raining so hard today that I really don't feel like going to work.",
    "tip": "Avoid literal 'rain very big'; use 'rain heavily' or 'pour'. Use 'feel like + V-ing'."
  },
  {
    "id": 2,
    "is_correct": true,
    "score": 90,
    "native_version": "Could you save this seat for me?",
    "tip": "'Save a seat' sounds more idiomatic and natural than 'keep a seat'."
  }
]
```

---

## 6. Edge Cases & Robustness
- **Browser Unsupported**: If Web Speech API is not supported in the user's browser, display a notification recommending Chrome or Edge.
- **Microphone Permission Denied**: Display a clean prompt guiding the user to unblock mic permissions in site settings.
- **Empty Speech Input**: If user fails to speak within 10 seconds, record transcript as `"(No response)"` and mark `is_correct: false` automatically before passing to AI.