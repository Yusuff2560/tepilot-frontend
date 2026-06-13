"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Merhaba! Ben TePilot. Bir web sitesini gezeyim, araştırma yapayım veya yardımcı olayım.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [activeScreenshot, setActiveScreenshot] = useState(null);
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

      if (data.screenshots && data.screenshots.length > 0) {
        setScreenshots(data.screenshots);
        setActiveScreenshot(data.screenshots[data.screenshots.length - 1]);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || data.error },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Backend'e bağlanılamadı." },
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

      <div className="main-content">
        {/* Chat Panel */}
        <div className="chat-panel">
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
        </div>

        {/* Browser Panel */}
        <div className="browser-panel">
          <div className="browser-header">
            <span className="browser-title">🌐 Tarayıcı</span>
            {screenshots.length > 0 && (
              <span className="screenshot-count">{screenshots.length} ekran</span>
            )}
          </div>

          <div className="browser-screen">
            {activeScreenshot ? (
              <img
                src={`data:image/jpeg;base64,${activeScreenshot}`}
                alt="Browser screenshot"
                className="screenshot-img"
              />
            ) : (
              <div className="browser-empty">
                <span>🤖</span>
                <p>TePilot bir web sitesine gittiğinde<br />ekran burada görünecek</p>
              </div>
            )}
          </div>

          {screenshots.length > 1 && (
            <div className="screenshot-strip">
              {screenshots.map((s, i) => (
                <img
                  key={i}
                  src={`data:image/jpeg;base64,${s}`}
                  alt={`Screenshot ${i + 1}`}
                  className={`strip-thumb ${s === activeScreenshot ? "active" : ""}`}
                  onClick={() => setActiveScreenshot(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0f;
          color: #e8e8f0;
          font-family: 'SF Mono', 'Fira Code', monospace;
          height: 100vh;
          overflow: hidden;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid #1e1e2e;
          background: #0a0a0f;
          flex-shrink: 0;
        }

        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon { font-size: 18px; }
        .logo-text { font-size: 17px; font-weight: 700; letter-spacing: 0.05em; color: #a78bfa; }

        .status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }

        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Chat Panel */
        .chat-panel {
          display: flex;
          flex-direction: column;
          width: 420px;
          flex-shrink: 0;
          border-right: 1px solid #1e1e2e;
        }

        .chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          scrollbar-width: thin;
          scrollbar-color: #1e1e2e transparent;
        }

        .message { display: flex; }
        .message.user { justify-content: flex-end; }
        .message.assistant { justify-content: flex-start; }

        .bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
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

        .bubble pre { font-family: inherit; white-space: pre-wrap; word-break: break-word; }

        .typing { display: flex; gap: 5px; align-items: center; padding: 14px; }
        .typing span { width: 6px; height: 6px; background: #6d28d9; border-radius: 50%; animation: bounce 1.2s infinite; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }

        .input-area {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid #1e1e2e;
          background: #0a0a0f;
          align-items: flex-end;
        }

        .input-area textarea {
          flex: 1;
          background: #111120;
          border: 1px solid #1e1e3e;
          border-radius: 10px;
          padding: 10px 14px;
          color: #e8e8f0;
          font-family: inherit;
          font-size: 13px;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          max-height: 100px;
        }

        .input-area textarea:focus { border-color: #6d28d9; }
        .input-area textarea::placeholder { color: #3d3d5c; }

        .input-area button {
          width: 40px;
          height: 40px;
          background: #6d28d9;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .input-area button:hover:not(:disabled) { background: #7c3aed; }
        .input-area button:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Browser Panel */
        .browser-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .browser-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid #1e1e2e;
          background: #0d0d1a;
        }

        .browser-title { font-size: 13px; color: #6b7280; }
        .screenshot-count { font-size: 11px; color: #4c1d95; background: #1e1e3e; padding: 2px 8px; border-radius: 10px; }

        .browser-screen {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #080810;
          position: relative;
        }

        .screenshot-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .browser-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #2d2d4d;
          text-align: center;
        }

        .browser-empty span { font-size: 48px; opacity: 0.3; }
        .browser-empty p { font-size: 13px; line-height: 1.6; }

        .screenshot-strip {
          display: flex;
          gap: 6px;
          padding: 8px 12px;
          border-top: 1px solid #1e1e2e;
          background: #0d0d1a;
          overflow-x: auto;
          flex-shrink: 0;
        }

        .strip-thumb {
          width: 80px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          opacity: 0.6;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .strip-thumb:hover { opacity: 1; }
        .strip-thumb.active { border-color: #6d28d9; opacity: 1; }

        @media (max-width: 768px) {
          .main-content { flex-direction: column; }
          .chat-panel { width: 100%; height: 50vh; border-right: none; border-bottom: 1px solid #1e1e2e; }
        }
      `}</style>
    </main>
  );
}
