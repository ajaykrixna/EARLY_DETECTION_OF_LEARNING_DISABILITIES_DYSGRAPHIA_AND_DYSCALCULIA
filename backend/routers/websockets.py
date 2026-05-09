from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
from typing import List, Dict

router = APIRouter(prefix="/ws", tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # Room ID -> List of {user_id, websocket}
        self.active_connections: Dict[str, List[Dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append({"user_id": user_id, "socket": websocket})

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [c for c in self.active_connections[room_id] if c["user_id"] != user_id]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: dict, room_id: str, sender_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection["user_id"] != sender_id:
                    await connection["socket"].send_json(message)

    async def send_personal_message(self, message: dict, room_id: str, recipient_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection["user_id"] == recipient_id:
                    await connection["socket"].send_json(message)
                    break

manager = ConnectionManager()

@router.websocket("/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(websocket, room_id, user_id)
    try:
        # Sync existing users to the newly connected user
        existing_users = [c["user_id"] for c in manager.active_connections.get(room_id, []) if c["user_id"] != user_id]
        await websocket.send_json({"type": "room-users", "users": existing_users})

        # Notify others in the room that a new user connected
        await manager.broadcast(
            {"type": "user-joined", "userId": user_id}, 
            room_id, 
            user_id
        )
        
        while True:
            data = await websocket.receive_json()
            # Relay signaling messages
            target_id = data.get("targetId")
            if target_id:
                # Direct message (Offer/Answer/Candidate)
                await manager.send_personal_message(data, room_id, target_id)
            else:
                # Broadcast (e.g. chat)
                await manager.broadcast(data, room_id, user_id)
                
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        await manager.broadcast(
            {"type": "user-left", "userId": user_id}, 
            room_id, 
            user_id
        )

# Global Notifications WebSockets
class NotificationManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [ws for ws in self.active_connections[user_id] if ws != websocket]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_notification(self, message: dict, user_id: str):
        with open("ws_debug.log", "a") as f:
            f.write(f"Attempting to send notification to user {user_id}. Active connections: {list(self.active_connections.keys())}\n")
        if user_id in self.active_connections:
            # Create a copy of the list for safe iteration
            connections = list(self.active_connections[user_id])
            with open("ws_debug.log", "a") as f:
                f.write(f"Found {len(connections)} active connections for user {user_id}\n")
            for ws in connections:
                try:
                    await ws.send_json(message)
                    with open("ws_debug.log", "a") as f:
                        f.write(f"Successfully sent message to user {user_id}\n")
                except Exception as e:
                    with open("ws_debug.log", "a") as f:
                        f.write(f"Error sending to ws: {e}\n")
                    self.disconnect(ws, user_id)
        else:
            with open("ws_debug.log", "a") as f:
                f.write(f"User {user_id} not found in active connections.\n")

notification_manager = NotificationManager()

@router.websocket("/notifications/{user_id}")
async def notification_endpoint(websocket: WebSocket, user_id: str):
    await notification_manager.connect(websocket, user_id)
    try:
        while True:
            # Just keep the connection alive
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(websocket, user_id)
