"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CallSummary, Message, Order } from "@/lib/types";

interface SpeechRecognitionResultEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface BrowserRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
}

type RecognitionConstructor = new () => BrowserRecognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const initialGreeting: Message = {
  role: "assistant",
  content: "Hi, I’m Aria from Aura Skincare. How can I help you today?",
  timestamp: new Date().toISOString(),
};

export default function VoiceAgent() {
  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [callActive, setCallActive] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [toolUsed, setToolUsed] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const callActiveRef = useRef(false);
  const messagesRef = useRef(messages);
  const processingRef = useRef(false);
  const shouldRestartRecognitionRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const preferredVoice = useMemo(() => {
    return (
      voices.find((v) => v.lang.toLowerCase() === "en-in") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en-in")) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
      null
    );
  }, [voices]);

  const stopRecognition = () => {
    try { recognitionRef.current?.stop(); } catch {}
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setState("idle");
      if (callActiveRef.current) startRecognition();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = preferredVoice?.lang || "en-IN";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => {
      setState("idle");
      if (callActiveRef.current && shouldRestartRecognitionRef.current) startRecognition();
    };
    utterance.onerror = () => {
      setState("idle");
      if (callActiveRef.current && shouldRestartRecognitionRef.current) startRecognition();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startRecognition = () => {
    if (!callActiveRef.current || processingRef.current) return;

    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Speech recognition is not available in this browser. Use Chrome/Edge or type a message below.");
      setState("idle");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new Constructor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => setState("listening");
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
        if (result) void sendMessage(result);
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone permission was blocked. Allow microphone access and try again.");
          setState("idle");
          return;
        }
        setState("idle");
        if (callActiveRef.current && !processingRef.current) {
          window.setTimeout(() => startRecognition(), 400);
        }
      };
      recognition.onend = () => {
        if (callActiveRef.current && !processingRef.current && shouldRestartRecognitionRef.current) {
          window.setTimeout(() => startRecognition(), 250);
        }
      };
      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
    } catch {
      // Recognition can throw if start is called while already active.
    }
  };

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || processingRef.current) return;

    processingRef.current = true;
    shouldRestartRecognitionRef.current = false;
    stopRecognition();
    setInput("");
    setError("");
    setState("thinking");

    const userMessage: Message = {
      role: "user",
      content: clean,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI request failed.");

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      const updated = [...nextMessages, assistantMessage];
      setMessages(updated);
      messagesRef.current = updated;
      if (data.toolUsed) setToolUsed(data.toolUsed);
      shouldRestartRecognitionRef.current = callActiveRef.current;
      speak(data.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      shouldRestartRecognitionRef.current = callActiveRef.current;
      setState("idle");
      if (callActiveRef.current) window.setTimeout(() => startRecognition(), 500);
    } finally {
      processingRef.current = false;
    }
  };

  const startCall = () => {
    setError("");
    setSummary(null);
    setMessages([initialGreeting]);
    setToolUsed(null);
    messagesRef.current = [initialGreeting];
    callActiveRef.current = true;
    setCallActive(true);
    shouldRestartRecognitionRef.current = true;
    speak(initialGreeting.content);
  };

  const endCall = async () => {
    callActiveRef.current = false;
    shouldRestartRecognitionRef.current = false;
    setCallActive(false);
    stopRecognition();
    window.speechSynthesis?.cancel();
    setState("idle");

    if (messagesRef.current.length <= 1) return;

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesRef.current, toolUsed }),
      });
      const data = await response.json();
      if (response.ok) setSummary(data.summary);
    } catch {
      setError("The call ended, but the structured summary could not be generated.");
    }
  };

  const handleTextSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!callActive) startCall();
    await sendMessage(input);
  };

  const useOrder = (order: Order) => {
    const prompt = `Where is my order ${order.order_id}?`;
    if (!callActiveRef.current) startCall();
    void sendMessage(prompt);
  };

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div className="brand">
            <div className="logo">A</div>
            <div>
              <h1>Aura Skincare</h1>
              <p>AI Voice Customer Support Agent</p>
            </div>
          </div>
          <div className="badge">DAT ASTRW · AI VOICE CX ASSESSMENT</div>
        </header>

        <div className="grid">
          <main className="card main-card">
            <div>
              <h2 className="card-title">Talk to Aria</h2>
              <p className="card-subtitle">Ask about orders, shipping, returns, cancellations or COD.</p>
            </div>

            <section className="agent-panel">
              <div className="avatar">A</div>
              <div className="agent-name">Aria</div>
              <div className="agent-role">Aura Skincare · Customer Support Specialist</div>
              <div className="state">
                <span className={`dot ${state === "listening" || state === "speaking" ? "live" : state === "thinking" ? "warn" : ""}`} />
                {state === "listening" ? "Listening" : state === "thinking" ? "Thinking" : state === "speaking" ? "Speaking" : callActive ? "Ready" : "Call ended"}
              </div>

              <div className="controls">
                <button className="primary" onClick={startCall} disabled={callActive}>🎙 Start Call</button>
                <button className="danger" onClick={endCall} disabled={!callActive}>■ End Call</button>
              </div>

              {!callActive && (
                <div className="notice">
                  Click Start Call and allow microphone access. If your browser does not support SpeechRecognition, use the text box below as a fallback.
                </div>
              )}
            </section>

            <section className="transcript">
              <h2 className="card-title">Live Transcript</h2>
              <div className="transcript-list">
                {messages.map((message, index) => (
                  <div key={`${message.timestamp}-${index}`} className={`message ${message.role}`}>
                    <span className="message-label">{message.role === "user" ? "Customer" : "Aria"}</span>
                    {message.content}
                  </div>
                ))}
              </div>
            </section>

            <form className="composer" onSubmit={handleTextSubmit}>
              <div className="composer-row">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Text fallback: e.g. Where is ORD-101?"
                  disabled={state === "thinking"}
                />
                <button className="secondary" type="submit" disabled={!input.trim() || state === "thinking"}>Send</button>
              </div>
              <div className="helper">Voice is the primary interaction. Text input is included as a reliable testing fallback.</div>
            </form>

            {error && <div className="notice">{error}</div>}
          </main>

          <aside>
            <section className="card side-card">
              <h2 className="card-title">Test Orders Helper</h2>
              <p className="card-subtitle">Use these IDs to test order lookup and policy behavior.</p>
              <div className="orders">
                {([
                  { order_id: "ORD-101", customer: "Priya Sharma", product: "Vitamin C Serum (30ml)", value: 699, status: "Out for Delivery", notes: "BlueDart — BD-982103. Expected by 6 PM today" },
                  { order_id: "ORD-102", customer: "Rahul Verma", product: "Hydrating Sunscreen SPF 50", value: 499, status: "Delivered", notes: "Delhivery — DL-441029. Delivered 14 days ago" },
                  { order_id: "ORD-103", customer: "Ananya Patel", product: "Green Tea Face Wash + Toner", value: 850, status: "Processing", notes: "Ordered 3 hours ago. Eligible for cancellation" },
                ] as Order[]).map((order) => (
                  <button key={order.order_id} className="order" onClick={() => useOrder(order)} style={{ textAlign: "left" }}>
                    <div className="order-top">
                      <span className="order-id">{order.order_id}</span>
                      <span className="status">{order.status}</span>
                    </div>
                    <p><strong>{order.customer}</strong> · {order.product} · ₹{order.value}</p>
                    <p>{order.notes}</p>
                  </button>
                ))}
              </div>

              <div className="policy">
                <h2 className="card-title">Aura Policies</h2>
                <ul>
                  <li>Free delivery above ₹499; otherwise ₹50 shipping. Standard delivery: 3–5 business days.</li>
                  <li>Returns within 7 days of delivery for unopened, unused products in original packaging.</li>
                  <li>Damaged/defective items: report within 48 hours with photos for replacement.</li>
                  <li>Cancellation is allowed only while an order is Processing.</li>
                  <li>COD is available for orders up to ₹2,500 via cash or UPI at the doorstep.</li>
                </ul>
              </div>

              {summary && (
                <div className="summary">
                  <strong>Post-Call Structured Summary</strong>
                  <pre>{JSON.stringify(summary, null, 2)}</pre>
                </div>
              )}
            </section>
          </aside>
        </div>

        <div className="footer">Browser voice + Gemini reasoning + function calling + post-call summary</div>
      </div>
    </div>
  );
}
