import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = "ws://localhost:8000/ws";
const COLORS = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#9b5de5", "#ffffff", "#000000"];
const SIZES = [2, 5, 10, 20];
const generateId = () => Math.random().toString(36).slice(2, 9);

export default function App() {
  const clientId = useRef(generateId());
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);

  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState("pen"); // "pen" | "eraser"
  const [online, setOnline] = useState(1);
  const [connected, setConnected] = useState(false);

  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const toolRef = useRef(tool);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  // ── Canvas helpers ──────────────────────────────────────────────────────────
  const getCtx = () => canvasRef.current?.getContext("2d");

  const drawStroke = useCallback((ctx, stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
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

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = clientId.current;
    const ws = new WebSocket(`${WS_URL}/${id}`);
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
      } else if (type === "draw_progress") {
        // Optional: show live strokes from others
      } else if (type === "clear") {
        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (type === "user_joined" || type === "user_left") {
        setOnline(payload.count);
      }
    };

    return () => ws.close();
  }, [drawStroke, redrawAll]);

  const send = (msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  // ── Drawing ─────────────────────────────────────────────────────────────────
  const currentPoints = useRef([]);

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

  // ── Resize ──────────────────────────────────────────────────────────────────
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

  // ── Clear ───────────────────────────────────────────────────────────────────
  const clearAll = () => {
    const canvas = canvasRef.current;
    getCtx().clearRect(0, 0, canvas.width, canvas.height);
    send({ type: "clear", payload: {} });
  };

  // ── UI ───────────────────────────────────────────────────────────────────────
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
          borderRadius: 4, border: "1px solid #e63946", background: "transparent",
          color: "#e63946", cursor: "pointer"
        }}>Clear</button>
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

      {/* Toolbar */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        borderRadius: 12, padding: "8px 14px", zIndex: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
      }}>
        {/* Tool toggles */}
        {["pen", "eraser"].map((t) => (
          <button key={t} onClick={() => setTool(t)} style={{
            fontFamily: "monospace", fontSize: 11,
            padding: "5px 10px", borderRadius: 6,
            border: `1px solid ${tool === t ? "#e63946" : "#2a2a2a"}`,
            background: tool === t ? "#e6394622" : "transparent",
            color: tool === t ? "#e63946" : "#888", cursor: "pointer"
          }}>{t === "pen" ? "✏️ Pen" : "⬜ Eraser"}</button>
        ))}

        <div style={{ width: 1, height: 24, background: "#2a2a2a", margin: "0 4px" }} />

        {/* Colors */}
        {COLORS.map((c) => (
          <div key={c} onClick={() => { setColor(c); setTool("pen"); }} style={{
            width: 20, height: 20, borderRadius: "50%",
            background: c, cursor: "pointer",
            border: color === c && tool === "pen" ? "2px solid #fff" : "2px solid transparent",
            boxSizing: "border-box", flexShrink: 0,
            transform: color === c && tool === "pen" ? "scale(1.2)" : "scale(1)",
            transition: "transform 0.15s"
          }} />
        ))}

        <div style={{ width: 1, height: 24, background: "#2a2a2a", margin: "0 4px" }} />

        {/* Sizes */}
        {SIZES.map((s) => (
          <div key={s} onClick={() => setSize(s)} style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `1px solid ${size === s ? "#e63946" : "#2a2a2a"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", background: size === s ? "#e6394622" : "transparent"
          }}>
            <div style={{
              width: Math.min(s * 1.5, 18), height: Math.min(s * 1.5, 18),
              borderRadius: "50%", background: "#fff"
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}