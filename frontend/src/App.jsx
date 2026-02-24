import { useState, useEffect, useRef, useCallback } from "react";

/* ──────────────────────────────────────────────────────────────── */
/* CLIENT ID (persistent) */
const clientId =
  localStorage.getItem("clientId") || crypto.randomUUID();
localStorage.setItem("clientId", clientId);

/* WEBSOCKET URL (local + production) */
const WS_URL =
  window.location.hostname === "localhost"
    ? `ws://127.0.0.1:8000/ws/${clientId}`
    : `wss://realtime-collaborative-whiteboard-96y3.onrender.com/ws/${clientId}`;

const COLORS = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#9b5de5", "#ffffff", "#000000"];
const SIZES = [2, 5, 10, 20];

/* ──────────────────────────────────────────────────────────────── */

export default function App() {
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const currentPoints = useRef([]);

  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState("pen");
  const [online, setOnline] = useState(1);
  const [connected, setConnected] = useState(false);

  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const toolRef = useRef(tool);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  /* ── Canvas Helpers ───────────────────────────────────────────── */

  const getCtx = () => canvasRef.current?.getContext("2d");

  const drawStroke = useCallback((ctx, stroke) => {
    if (!stroke?.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawAll = useCallback((strokes) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((s) => drawStroke(ctx, s));
  }, [drawStroke]);

  /* ── WebSocket Connection ─────────────────────────────────────── */

  useEffect(() => {
    const connect = async () => {
      try {
        // Wake Render backend (avoids cold start WS failure)
        if (window.location.hostname !== "localhost") {
          await fetch(
            "https://realtime-collaborative-whiteboard-96y3.onrender.com/health"
          );
        }
      } catch {}

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);

      ws.onmessage = (e) => {
        const { type, payload } = JSON.parse(e.data);
        const ctx = getCtx();

        if (type === "init") {
          redrawAll(payload);
        } else if (type === "draw") {
          drawStroke(ctx, payload);
        } else if (type === "clear") {
          const canvas = canvasRef.current;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (type === "user_joined" || type === "user_left") {
          setOnline(payload.count);
        }
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [drawStroke, redrawAll]);

  const send = (msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  /* ── Drawing Logic ────────────────────────────────────────────── */

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    currentPoints.current = [pos];
  };

  const moveDraw = (e) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    const pos = getPos(e);

    const stroke = {
      points: [lastPos.current, pos],
      color: toolRef.current === "eraser" ? "#000000" : colorRef.current,
      size: sizeRef.current,
      tool: toolRef.current,
    };

    drawStroke(ctx, stroke);
    currentPoints.current.push(pos);
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;

    const stroke = {
      points: currentPoints.current,
      color: toolRef.current === "eraser" ? "#000000" : colorRef.current,
      size: sizeRef.current,
      tool: toolRef.current,
    };

    send({ type: "draw", payload: stroke });
    currentPoints.current = [];
  };

  /* ── Resize Canvas ────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ── Clear Canvas ─────────────────────────────────────────────── */

  const clearAll = () => {
    const canvas = canvasRef.current;
    getCtx().clearRect(0, 0, canvas.width, canvas.height);
    send({ type: "clear", payload: {} });
  };

  /* ── UI ───────────────────────────────────────────────────────── */

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 52, background: "#1a1a1a", borderBottom: "1px solid #2a2a2a",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 10
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#fff", fontFamily: "monospace" }}>
          ✏️ Whiteboard
        </span>

        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 99,
          background: connected ? "#2a9d8f22" : "#55555522",
          border: `1px solid ${connected ? "#2a9d8f" : "#555"}`,
          color: connected ? "#2a9d8f" : "#888", fontFamily: "monospace"
        }}>
          {connected ? `● ${online} online` : "○ connecting..."}
        </span>

        <div style={{ flex: 1 }} />

        <button onClick={clearAll} style={{
          fontFamily: "monospace", fontSize: 11, padding: "5px 12px",
          borderRadius: 4, border: "1px solid #e63946",
          background: "transparent", color: "#e63946", cursor: "pointer"
        }}>
          Clear
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}