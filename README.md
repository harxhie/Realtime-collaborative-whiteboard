🧠 Realtime Collaborative Whiteboard
<p align="center"> <b>A production-ready realtime collaborative drawing app built with React, FastAPI & WebSockets.</b> </p> <p align="center"> <a href="https://realtime-collaborative-whiteboard-rho.vercel.app/"> <img src="https://img.shields.io/badge/🚀 Live%20Demo-Open%20App-black?style=for-the-badge&logo=vercel"> </a> </p> <p align="center"> <img src="https://img.shields.io/badge/Frontend-React-blue?logo=react"> <img src="https://img.shields.io/badge/Backend-FastAPI-green?logo=fastapi"> <img src="https://img.shields.io/badge/Realtime-WebSockets-purple"> <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel"> <img src="https://img.shields.io/badge/API-Render-46E3B7"> </p>
🚀 Live Demo

🌐 Frontend: https://realtime-collaborative-whiteboard-rho.vercel.app/

⚡ Backend API: https://realtime-collaborative-whiteboard-96y3.onrender.com

✨ Features

🎨 Realtime multi-user drawing

⚡ Instant WebSocket synchronization

👥 Live online user counter

🖊 Pen & Eraser tools

🎯 Adjustable brush sizes & colors

🧹 Global canvas clearing

🔄 Persistent client identity

☁️ Fully deployed cloud architecture

🏗️ System Architecture
React (Vercel)
     │
     │   WSS Connection
     ▼
FastAPI WebSocket Server (Render)
     │
     ├── Connection Manager
     ├── Broadcast Engine
     └── Canvas State Sync
🧰 Tech Stack
Frontend

React (Vite)

HTML5 Canvas API

WebSockets

Modern Hooks Architecture

Backend

FastAPI

AsyncIO

WebSocket Manager

Uvicorn ASGI Server

Deployment

Vercel — Frontend Hosting

Render — Backend Hosting

📂 Project Structure
realtime-collaborative-whiteboard/
│
├── frontend/
│   ├── src/
│   ├── package.json
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│
└── README.md
⚙️ Local Setup
1️⃣ Clone Repository
git clone https://github.com/harxhie/realtime-collaborative-whiteboard.git
cd realtime-collaborative-whiteboard
2️⃣ Backend Setup
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

Runs at:

http://127.0.0.1:8000
3️⃣ Frontend Setup
cd frontend
npm install
npm run dev

Runs at:

http://localhost:5173
🌐 Deployment
Backend — Render

Start Command:

python -m uvicorn main:app --host 0.0.0.0 --port 10000 --proxy-headers
Frontend — Vercel
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
🔌 WebSocket Endpoint
/ws/{client_id}

Example:

wss://realtime-collaborative-whiteboard-96y3.onrender.com/ws/<client_id>
🧠 Engineering Highlights

Built an async WebSocket broadcast system using FastAPI

Designed low-latency realtime canvas synchronization

Implemented persistent client identity using localStorage

Optimized drawing performance using incremental strokes

Production deployment with Vercel + Render

📜 License

MIT License — free to use and modify.
