import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

export default function ChatbotWidget() {
  const { auth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      sender: "bot",
      text: "Namaste! 🙏 I'm your AryogaSutra health assistant. Ask me about remedies, yoga, diet, or finding a doctor.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Listen for dosha-complete event to auto-open and greet
  useEffect(() => {
    function handleDoshaComplete(e: Event) {
      const detail = (e as CustomEvent<{ dosha: string }>).detail;
      const dosha = detail?.dosha ?? "your Dosha";
      setIsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          sender: "bot",
          text: `Namaste! 🙏 Your dominant Dosha is **${dosha}**. I can now give you personalised Ayurvedic guidance. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
    window.addEventListener("aryoga:dosha-complete", handleDoshaComplete);
    return () => window.removeEventListener("aryoga:dosha-complete", handleDoshaComplete);
  }, []);

  // Only render for authenticated patients
  if (!auth.token || auth.role !== "PATIENT") return null;

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      sender: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Typing indicator
    const typingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: typingId, sender: "bot", text: "…", timestamp: new Date() },
    ]);

    try {
      const { data } = await api.post<{ reply: string }>("/chat", {
        message: text,
        patientId: auth.profileId ? Number(auth.profileId) : 0,
      });
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: nextId(),
            sender: "bot",
            text: data.reply,
            timestamp: new Date(),
          })
      );
    } catch {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: nextId(),
            sender: "bot",
            text: "Sorry, I couldn't reach the chatbot service. Please try again.",
            timestamp: new Date(),
          })
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Open chatbot"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-ayur-moss text-white shadow-lg hover:bg-ayur-leaf transition flex items-center justify-center text-2xl"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-[420px] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-ayur-moss text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <p className="font-semibold text-sm">AryogaSutra Assistant</p>
              <p className="text-xs opacity-80">Ayurvedic health guidance</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white text-lg leading-none"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-ayur-moss text-white rounded-br-sm"
                      : msg.text === "…"
                      ? "bg-stone-100 text-stone-400 rounded-bl-sm animate-pulse"
                      : "bg-stone-100 text-stone-800 rounded-bl-sm"
                  }`}
                >
                  {/* Render simple markdown bold */}
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-stone-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
              placeholder="Ask about remedies, yoga…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 rounded-xl bg-ayur-moss text-white text-sm font-medium disabled:opacity-50 hover:bg-ayur-leaf transition"
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
