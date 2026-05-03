"""
WebSocket Connection Manager
Handles real-time collaboration: live comments, typing indicators, notifications.
"""

import json
from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections per user and per room."""

    def __init__(self) -> None:
        # user_id → WebSocket
        self.active: dict[int, WebSocket] = {}
        # room_key → set of user_ids (e.g. "analysis:42", "project:7")
        self.rooms: dict[str, set[int]] = defaultdict(set)
        # user_id → {room_key: True} — fast lookup of user's rooms
        self.user_rooms: dict[int, set[str]] = defaultdict(set)

    # ── Connection lifecycle ──────────────────────────────────────────────

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        await websocket.accept()
        self.active[user_id] = websocket
        print(f"[WS] User {user_id} connected. Total: {len(self.active)}")

    def disconnect(self, user_id: int) -> None:
        self.active.pop(user_id, None)
        # Remove from all rooms
        for room in list(self.user_rooms.get(user_id, [])):
            self.rooms[room].discard(user_id)
            if not self.rooms[room]:
                del self.rooms[room]
        self.user_rooms.pop(user_id, None)
        print(f"[WS] User {user_id} disconnected. Total: {len(self.active)}")

    # ── Room management ───────────────────────────────────────────────────

    def join_room(self, user_id: int, room: str) -> None:
        self.rooms[room].add(user_id)
        self.user_rooms[user_id].add(room)

    def leave_room(self, user_id: int, room: str) -> None:
        self.rooms[room].discard(user_id)
        self.user_rooms[user_id].discard(room)

    # ── Send helpers ──────────────────────────────────────────────────────

    async def send_to_user(self, user_id: int, data: dict[str, Any]) -> None:
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(user_id)

    async def broadcast_to_room(
        self,
        room: str,
        data: dict[str, Any],
        exclude_user: int | None = None,
    ) -> None:
        targets = list(self.rooms.get(room, []))
        for uid in targets:
            if uid == exclude_user:
                continue
            await self.send_to_user(uid, data)

    async def broadcast_all(
        self, data: dict[str, Any], exclude_user: int | None = None
    ) -> None:
        for uid in list(self.active.keys()):
            if uid == exclude_user:
                continue
            await self.send_to_user(uid, data)

    # ── Event builders ────────────────────────────────────────────────────

    @staticmethod
    def make_event(event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }

    # ── Presence ──────────────────────────────────────────────────────────

    def get_room_users(self, room: str) -> list[int]:
        return list(self.rooms.get(room, []))

    def is_connected(self, user_id: int) -> bool:
        return user_id in self.active

    def connected_count(self) -> int:
        return len(self.active)


# Singleton — import this everywhere
manager = ConnectionManager()
