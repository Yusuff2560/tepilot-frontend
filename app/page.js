"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function useWake() {
  const [state, setState] = useState("waking");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let interval = null;

    interval = setInterval(() => {
      setProgress(p => p >= 88 ? p : p + (p < 40 ? 2 : p < 70 ? 0.8 : 0.2));
    }, 300);

    async function tryConnect() {
      while (!cancelled) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20000);
          const r = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
          clearTimeout(timeout);
          if (r.ok) {
            const data = await r.json();
            if (data.status === "ok" && !cancelled) {
              clearInterval(interval);
              setProgress(100);
              setTimeout(() => { if (!cancelled) setState("ready"); }, 300);
              return;
            }
          }
        } catch {}
        if (!cancelled) await new Promise(r => setTimeout(r, 3000));
      }
    }

    tryConnect();
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { state, progress };
}

function useLiveBrowser(ready) {
  const [frame, setFrame] = useState(null);
  const esRef = useRef(null);
  const frameRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!ready) return;

    const es = new EventSource(`${BACKEND_URL}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      if (pendingRef.current) cancelAnimationFrame(pendingRef.current);
      pendingRef.current = requestAnimationFrame(() => {
        const b64 = e.data;
        if (b64 !== frameRef.current) {
          frameRef.current = b64;
          setFrame(b64);
        }
        pendingRef.current = null;
      });
    };

    return () => {
      es.close();
      if (pendingRef.current) cancelAnimationFrame(pendingRef.current);
    };
  }, [ready]);

  return frame;
}

export default function TePilot() {
  const { state: wakeState, progress } = useWake();
  const isReady = wakeState === "ready";
  const liveFrame = useLiveBrowser(isReady);

  const [messages, setMessages] = useState([
    { role: "assistant", content: "TePilot hazır. Komut ver." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(true);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !isReady) return;
    const userMsg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.response || data.error }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Bağlantı hatası." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [input, loading, isReady, messages]);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const statusText = isReady
    ? `TEPILOT > ready${cursor ? "_" : " "}`
    : `TEPILOT > waking  ${Math.round(progress)}%`;

  return (
    <div className="root">
      <div className="bar">
        <span className="bar-text">{statusText}</span>
        {!isReady && (
          <div className="bar-progress">
            <div className="bar-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="bar-right">
          <span className={`led ${isReady ? "on" : "blink"}`} />
          <span className="bar-label">{isReady ? "live" : "starting"}</span>
        </div>
      </div>

      <div className="body">
        <aside className="chat">
          <div className="msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <span className="pfx">{m.role === "user" ? ">" : "~"}</span>
                <pre className="txt">{m.content}</pre>
              </div>
            ))}
            {loading && (
              <div className="msg assistant">
                <span className="pfx">~</span>
                <span className="dots"><span/><span/><span/></span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="inp-row">
            <span className="inp-pfx">&gt;</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isReady ? "komut ver" : "uyanıyor..."}
              disabled={loading || !isReady}
              rows={1}
              className="inp"
            />
            <button className="send" onClick={sendMessage} disabled={loading || !input.trim() || !isReady}>▲</button>
          </div>
        </aside>

        <div className="divider" />

        <main className="browser">
          <div className="browser-bar">
            <span className="browser-label">browser</span>
            {liveFrame && <span className="live-tag">● LIVE</span>}
          </div>

          <div className="viewport">
            {liveFrame ? (
              <img src={`data:image/jpeg;base64,${liveFrame}`} alt="live browser" className="live-img" decoding="async" />
            ) : (
              <div className="viewport-empty">
                <div className="grid-bg" />
                <span className="empty-label">{isReady ? "tarayıcı bekleniyor" : "başlatılıyor..."}</span>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { background: #07070f; color: #c0c0d8; font-family: 'Berkeley Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', ui-monospace, monospace; }
        .root { display: flex; flex-direction: column; height: 100vh; }
        .bar { height: 30px; background: #09091a; border-bottom: 1px solid #14143a; display: flex; align-items: center; padding: 0 14px; gap: 14px; flex-shrink: 0; }
        .bar-text { font-size: 10.5px; color: #7c5cfc; letter-spacing: 0.07em; font-weight: 700; width: 280px; flex-shrink: 0; }
        .bar-progress { flex: 1; max-width: 180px; height: 2px; background: #14143a; border-radius: 1px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #7c5cfc, #00e5a0); transition: width 0.3s ease; will-change: width; }
        .bar-right { margin-left: auto; display: flex; align-items: center; gap: 6px; }
        .led { width: 6px; height: 6px; border-radius: 50%; background: #00e5a0; box-shadow: 0 0 5px #00e5a0; }
        .led.blink { background: #f5a623; box-shadow: 0 0 5px #f5a623; animation: blink-led 1.2s ease infinite; }
        @keyframes blink-led { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .bar-label { font-size: 10px; color: #30305a; letter-spacing: 0.05em; }
        .body { display: flex; flex: 1; overflow: hidden; }
        .chat { width: 350px; flex-shrink: 0; display: flex; flex-direction: column; background: #07070f; }
        .msgs { flex: 1; overflow-y: auto; padding: 18px 14px 10px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: #14143a transparent; }
        .msg { display: flex; gap: 8px; align-items: flex-start; }
        .pfx { font-size: 11px; font-weight: 800; flex-shrink: 0; line-height: 1.7; width: 12px; }
        .msg.user .pfx { color: #7c5cfc; }
        .msg.assistant .pfx { color: #00e5a0; }
        .txt { font-family: inherit; font-size: 12px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; color: #a8a8c8; }
        .msg.user .txt { color: #dcdcf4; }
        .dots { display: flex; gap: 4px; align-items: center; padding-top: 6px; }
        .dots span { width: 5px; height: 5px; border-radius: 50%; background: #00e5a0; opacity: 0.3; animation: dot-pulse 1.2s ease infinite; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dot-pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.85)} 40%{opacity:1;transform:scale(1)} }
        .inp-row { display: flex; align-items: flex-end; gap: 8px; padding: 10px 14px 13px; border-top: 1px solid #0f0f22; }
        .inp-pfx { color: #7c5cfc; font-size: 13px; font-weight: 800; padding-bottom: 8px; flex-shrink: 0; }
        .inp { flex: 1; background: transparent; border: none; border-bottom: 1px solid #1e1e40; color: #e0e0f4; font-family: inherit; font-size: 12px; padding: 5px 0 8px; resize: none; outline: none; line-height: 1.5; max-height: 72px; overflow-y: auto; transition: border-color 0.12s; }
        .inp:focus { border-bottom-color: #7c5cfc; }
        .inp::placeholder { color: #232340; }
        .inp:disabled { opacity: 0.35; }
        .send { width: 26px; height: 26px; background: #7c5cfc; border: none; border-radius: 5px; color: #fff; font-size: 10px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-bottom: 1px; transition: background 0.12s, transform 0.1s; }
        .send:hover:not(:disabled) { background: #9474ff; transform: translateY(-1px); }
        .send:disabled { opacity: 0.25; cursor: not-allowed; }
        .divider { width: 1px; background: linear-gradient(to bottom, transparent 5%, #7c5cfc30 40%, #00e5a020 60%, transparent 95%); flex-shrink: 0; }
        .browser { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #050510; }
        .browser-bar { height: 30px; border-bottom: 1px solid #0f0f22; display: flex; align-items: center; padding: 0 14px; gap: 10px; flex-shrink: 0; }
        .browser-label { font-size: 10px; color: #20204a; letter-spacing: 0.1em; text-transform: uppercase; }
        .live-tag { font-size: 10px; color: #00e5a0; letter-spacing: 0.06em; margin-left: auto; }
        .viewport { flex: 1; overflow: hidden; position: relative; display: flex; align-items: stretch; }
        .live-img { width: 100%; height: 100%; object-fit: contain; display: block; will-change: contents; }
        .viewport-empty { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
        .grid-bg { position: absolute; inset: 0; background-image: linear-gradient(#12123a18 1px, transparent 1px), linear-gradient(90deg, #12123a18 1px, transparent 1px); background-size: 32px 32px; }
        .empty-label { font-size: 11px; color: #1e1e40; letter-spacing: 0.08em; position: relative; }
      `}</style>
    </div>
  );
}
