"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Merhaba! Ben TePilot. Sana web'de gezinmem, sayfa analiz etmem veya herhangi bir konuda yardım etmem için komut ver.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || data.error },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Backend'e bağlanılamadı. Render servisini kontrol et." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">TePilot</span>
        </div>
        <span className="status">
          <span className="status-dot" />
          Online
        </span>
      </header>

      <div className="chat-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="bubble">
              <pre>{msg.content}</pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Komut ver... (Enter ile gönder)"
          rows={1}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "..." : "↑"}
        </button>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: #0a0a0f;
          color: #e8e8f0;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
          height: 100vh;
          overflow: hidden;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #1e1e2e;
          background: #0a0a0f;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          font-size: 20px;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #a78bfa;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
        }

        .chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scrollbar-width: thin;
          scrollbar-color: #1e1e2e transparent;
        }

        .chat-container::-webkit-scrollbar { width: 4px; }
        .chat-container::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }

        .message {
          display: flex;
        }

        .message.user {
          justify-content: flex-end;
        }

        .message.assistant {
          justify-content: flex-start;
        }

        .bubble {
          max-width: 75%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
        }

        .message.user .bubble {
          background: #4c1d95;
          border: 1px solid #6d28d9;
          color: #ede9fe;
          border-radius: 12px 12px 2px 12px;
        }

        .message.assistant .bubble {
          background: #111120;
          border: 1px solid #1e1e3e;
          color: #c4c4d4;
          border-radius: 12px 12px 12px 2px;
        }

        .bubble pre {
          font-family: inherit;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .typing {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 16px;
        }

        .typing span {
          width: 6px;
          height: 6px;
          background: #6d28d9;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }

        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        .input-area {
          display: flex;
          gap: 10px;
          padding: 16px;
          border-top: 1px solid #1e1e2e;
          background: #0a0a0f;
          align-items: flex-end;
        }

        .input-area textarea {
          flex: 1;
          background: #111120;
          border: 1px solid #1e1e3e;
          border-radius: 10px;
          padding: 12px 16px;
          color: #e8e8f0;
          font-family: inherit;
          font-size: 14px;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          max-height: 120px;
          overflow-y: auto;
        }

        .input-area textarea:focus {
          border-color: #6d28d9;
        }

        .input-area textarea::placeholder {
          color: #3d3d5c;
        }

        .input-area button {
          width: 44px;
          height: 44px;
          background: #6d28d9;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 20px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .input-area button:hover:not(:disabled) {
          background: #7c3aed;
          transform: scale(1.05);
        }

        .input-area button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
// rebuilt Sat Jun 13 16:52:59 UTC 2026
