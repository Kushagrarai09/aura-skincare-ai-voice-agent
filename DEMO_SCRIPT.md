# 3–5 Minute Demo Script

## 0:00–0:25 — Introduction

"This is Aura Skincare, a browser-based AI customer support voice agent. The agent is Aria, a concise Indian customer support specialist. The evaluator can speak naturally through the microphone and receive spoken responses."

## 0:25–1:20 — Order lookup

Click Start Call.

Say: "Hi Aria, where is my order ORD-101?"

Show:
- Listening
- Thinking
- Tool call behavior
- Spoken response
- Transcript

Explain: "The model recognizes that this is an order-specific request and uses get_order_details instead of guessing."

## 1:20–2:05 — Policy enforcement

Say: "I want to cancel ORD-101."

Expected: refusal because the order is Out for Delivery.

Then say: "Can I cancel ORD-103?"

Expected: yes, because it is Processing.

Explain: "The agent follows business rules instead of simply agreeing with the customer."

## 2:05–2:35 — Edge cases

Say: "Where is ORD-999?"

Expected: unable to locate it.

Say: "Can you book me a flight to Goa?"

Expected: politely out of scope.

## 2:35–3:10 — Post-call output

Click End Call.

Show the chronological transcript and structured JSON summary.

## 3:10–4:00 — Architecture

Show the README architecture:

Browser microphone → SpeechRecognition → Next.js → Gemini → get_order_details → mock order data → Gemini response → SpeechSynthesis → browser speaker.

Explain that the Gemini API key is kept server-side.

## 4:00–4:30 — Scaling

Briefly explain that at 1,000 calls/day you would move to a managed database, scale the application horizontally, add Redis/session state where useful, queue asynchronous summaries, add observability and rate limits, and optimize LLM/voice costs.
