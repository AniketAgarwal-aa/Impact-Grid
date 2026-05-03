"""
WebSocket Router
Handles real-time connections: /ws/{user_id}
Supports: room join/leave, typing indicators, comment broadcasting, notifications.
"""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..websocket_manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """
    Main WebSocket endpoint.
    Client sends JSON messages with { "type": ..., "payload": ... }

    Supported message types (client → server):
      - join_room      : { room: "analysis:42" }
      - leave_room     : { room: "analysis:42" }
      - typing_start   : { room: "...", user_name: "..." }
      - typing_stop    : { room: "..." }
      - ping           : {} → pong response
    """
    await manager.connect(websocket, user_id)
    try:
        # Announce online presence to all
        await manager.broadcast_all(
            manager.make_event("user_online", {"user_id": user_id}),
            exclude_user=user_id,
        )
        # Send current online count back to the newly connected user
        await manager.send_to_user(
            user_id,
            manager.make_event(
                "connected",
                {
                    "user_id": user_id,
                    "online_count": manager.connected_count(),
                    "message": "Connected to ImpactSensei real-time server",
                },
            ),
        )

        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")
            payload = msg.get("payload", {})

            # ── Heartbeat ──────────────────────────────────────────────
            if msg_type == "ping":
                await manager.send_to_user(
                    user_id, manager.make_event("pong", {"user_id": user_id})
                )

            # ── Room management ────────────────────────────────────────
            elif msg_type == "join_room":
                room = payload.get("room", "")
                if room:
                    manager.join_room(user_id, room)
                    # Announce presence to room members
                    await manager.broadcast_to_room(
                        room,
                        manager.make_event(
                            "user_joined_room",
                            {
                                "user_id": user_id,
                                "room": room,
                                "viewers": manager.get_room_users(room),
                            },
                        ),
                    )

            elif msg_type == "leave_room":
                room = payload.get("room", "")
                if room:
                    manager.leave_room(user_id, room)
                    await manager.broadcast_to_room(
                        room,
                        manager.make_event(
                            "user_left_room",
                            {
                                "user_id": user_id,
                                "room": room,
                                "viewers": manager.get_room_users(room),
                            },
                        ),
                    )

            # ── Typing indicators ──────────────────────────────────────
            elif msg_type == "typing_start":
                room = payload.get("room", "")
                if room:
                    await manager.broadcast_to_room(
                        room,
                        manager.make_event(
                            "typing_start",
                            {
                                "user_id": user_id,
                                "user_name": payload.get("user_name", f"User {user_id}"),
                            },
                        ),
                        exclude_user=user_id,
                    )

            elif msg_type == "typing_stop":
                room = payload.get("room", "")
                if room:
                    await manager.broadcast_to_room(
                        room,
                        manager.make_event("typing_stop", {"user_id": user_id}),
                        exclude_user=user_id,
                    )

            # ── Live cursor tracking ───────────────────────────────────────
            elif msg_type == "cursor_move":
                room = payload.get("room", "")
                if room:
                    await manager.broadcast_to_room(
                        room,
                        manager.make_event(
                            "cursor_move",
                            {
                                "user_id": user_id,
                                "x": payload.get("x"),
                                "y": payload.get("y"),
                                "user_name": payload.get("user_name", f"User {user_id}"),
                                "color": payload.get("color", "#3B82F6"),
                            },
                        ),
                        exclude_user=user_id,
                    )

            # ── Direct message ─────────────────────────────────────────
            elif msg_type == "direct_message":
                target_id = payload.get("target_user_id")
                if target_id:
                    await manager.send_to_user(
                        int(target_id),
                        manager.make_event(
                            "direct_message",
                            {"from_user_id": user_id, "content": payload.get("content", "")},
                        ),
                    )

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast_all(
            manager.make_event("user_offline", {"user_id": user_id})
        )
