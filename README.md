# Aura Skincare — AI Voice CX Agent

A browser-based AI customer-support voice agent built for the Datastraw assessment.

## What it demonstrates

- Browser microphone voice input using the Web Speech API.
- AI reasoning with Gemini.
- `get_order_details(order_id)` function/tool calling against a mock order database.
- Aura Skincare policy guardrails.
- Graceful handling of missing/invalid order IDs and out-of-scope questions.
- Browser speech output with an Indian-English voice when one is available.
- Live state indicator: Listening / Thinking / Speaking.
- Post-call transcript.
- Structured JSON call summary.
- Text fallback for browsers where SpeechRecognition is unavailable.

The assessment allows the technology stack to be chosen freely and explicitly says the browser experience does not require telephony.

## Architecture

```text
Browser
  │
  ├── Microphone
  │      ↓
  │  Web Speech API (STT)
  │      ↓
  ├── Next.js React UI
  │      ↓ POST /api/chat
  │  Gemini model
  │      │
  │      ├── normal Aura question → answer from policy prompt
  │      │
  │      └── order question → get_order_details(order_id)
  │                                ↓
  │                              data/orders.json
  │                                ↓
  │                           Gemini final answer
  │      ↓
  │  Browser SpeechSynthesis (TTS)
  │      ↓
  │  Speaker
  │
  └── End Call → POST /api/summary → structured JSON
```

## Project structure

```text
app/
├── api/
│   ├── chat/route.ts
│   └── summary/route.ts
├── globals.css
├── layout.tsx
└── page.tsx
components/
└── VoiceAgent.tsx
data/
└── orders.json
lib/
├── agent.ts
├── orders.ts
└── types.ts
.env.example
.gitignore
next.config.mjs
next-env.d.ts
package.json
README.md
tsconfig.json
```

## Requirements

- Node.js 20+
- A modern browser. Chrome/Edge are recommended because `SpeechRecognition` has limited browser availability.
- Gemini API key from Google AI Studio.

## Local setup

```bash
npm install
```

Create `.env.local`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Then:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Allow microphone access and click **Start Call**.

## Recommended test script

### 1. Order lookup

Say:

> Where is my order ORD-101?

Expected: the agent calls `get_order_details` and explains that ORD-101 is out for delivery via BlueDart and expected by 6 PM today.

### 2. Cancellation policy

Say:

> I want to cancel ORD-101.

Expected: the agent checks the order and refuses cancellation because it is already Out for Delivery.

Then test:

> Can I cancel ORD-103?

Expected: the agent checks the order and explains that it is still Processing and therefore eligible for cancellation.

### 3. Return policy

Say:

> I bought my product 20 days ago and opened it. Can I return it?

Expected: polite refusal based on the 7-day unopened/unused policy.

### 4. Invalid order

Say:

> Where is ORD-999?

Expected: the agent says it cannot locate the order and asks the customer to verify the ID.

### 5. Missing order ID

Say:

> Where is my order?

Expected: the agent asks for the order ID instead of guessing.

### 6. Out of scope

Say:

> Can you book me a flight to Goa?

Expected: the agent explains that it can only help with Aura Skincare-related support.

## Why this architecture?

I chose a Next.js full-stack application so the evaluator can open one public URL and test the complete workflow without running a separate frontend manually. Browser speech APIs keep the MVP lightweight, while Gemini is kept server-side so the API key is never exposed to the browser. Order information is isolated behind a function tool, which makes the agent's use of live order data explicit and prevents it from inventing order details.

## Most difficult part

The hardest part is coordinating conversational state, tool calling and voice state transitions without making the interaction feel like a form. The implementation separates Listening, Thinking and Speaking states, pauses recognition while the agent speaks, executes `get_order_details` only when the model requests it, and then sends the tool result back to the model for a grounded customer-facing response.

## If I had one more week

I would replace the browser SpeechRecognition/SpeechSynthesis layer with a production realtime speech-to-speech service for lower latency and more consistent browser behavior. I would also add interruption/barge-in, observability, authentication, persistent call storage, automated evaluation tests, and a real database.

## At 1,000 conversations/day

I would move orders to PostgreSQL or another managed database, add connection pooling and indexes, horizontally scale the application, add Redis for short-lived session state/caching where appropriate, introduce request/rate-limit controls, add structured logs and tracing, monitor voice/LLM latency and error rates, implement retries and timeouts for provider calls, and control LLM/voice costs with model routing and caching. I would also separate synchronous voice traffic from asynchronous analytics/summary workloads using a queue.

## Deployment

### Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables.
4. Add `GEMINI_MODEL=gemini-2.5-flash`.
5. Deploy.
6. Open the public URL in Chrome/Edge and allow microphone access.

Do not commit `.env.local` or any API key.

## Important browser note

The Web Speech API has two separate parts: SpeechRecognition for speech-to-text and SpeechSynthesis for text-to-speech. SpeechSynthesis is broadly available, while SpeechRecognition has limited availability across browsers. Chrome/Edge are therefore recommended for the assessment demo. The app includes a text fallback so the core AI/tool flow can still be demonstrated if recognition is unavailable.

## Submission checklist

- [ ] Public application URL
- [ ] GitHub repository
- [ ] README with architecture and Section 9 answers
- [ ] `.env.example`
- [ ] 3–5 minute demo video
- [ ] Short 2–3 sentence approach note
- [ ] LinkedIn profile link
