from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.canvas_state: List[dict] = []

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        await websocket.send_json({"type": "init", "payload": self.canvas_state})
        await self.broadcast({"type": "user_joined", "payload": {"client_id": client_id, "count": len(self.active_connections)}}, exclude=client_id)

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def broadcast(self, message: dict, exclude: str = None):
        disconnected = []
        for cid, ws in self.active_connections.items():
            if cid == exclude:
                continue
            try:
                await ws.send_json(message)
            except:
                disconnected.append(cid)
        for cid in disconnected:
            self.disconnect(cid)


manager = ConnectionManager()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "draw":
                manager.canvas_state.append(data["payload"])
                await manager.broadcast(data, exclude=client_id)

            elif msg_type == "draw_progress":
                await manager.broadcast(data, exclude=client_id)

            elif msg_type == "clear":
                manager.canvas_state = []
                await manager.broadcast({"type": "clear", "payload": {}}, exclude=client_id)

            elif msg_type == "cursor":
                await manager.broadcast({
                    "type": "cursor",
                    "payload": {**data["payload"], "client_id": client_id}
                }, exclude=client_id)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast({"type": "user_left", "payload": {"client_id": client_id, "count": len(manager.active_connections)}})


@app.get("/health")
def health():
    return {"status": "ok", "connections": len(manager.active_connections)}