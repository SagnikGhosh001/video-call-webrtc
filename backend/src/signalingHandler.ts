import type { ClientMessage, ServerMessage } from "./types.ts";
import {
  addPeer,
  broadcastToRoom,
  getPeer,
  getRoomOfPeer,
  MAX_ROOM_SIZE,
  removePeer,
} from "./roomManager.ts";

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function handleConnection(socket: WebSocket): void {
  let myPeerId: string | null = null;

  socket.onmessage = (event: MessageEvent) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(event.data) as ClientMessage;
    } catch {
      send(socket, { type: "error", message: "Invalid JSON" });
      return;
    }

    switch (msg.type) {
      case "join": {
        const { roomId, peerId } = msg;
        if (!roomId || !peerId) {
          send(socket, { type: "error", message: "Missing roomId or peerId" });
          return;
        }

        myPeerId = peerId;
        const result = addPeer(roomId, { peerId, socket });

        if (result === "full") {
          send(socket, { type: "room-full", maxSize: MAX_ROOM_SIZE });
          return;
        }

        const room = getRoomOfPeer(peerId)!;
        const existingPeers = [...room.peers.keys()].filter((id) =>
          id !== peerId
        );

        send(socket, {
          type: "room-joined",
          roomId,
          peerId,
          existingPeers,
        });

        broadcastToRoom(room, { type: "user-joined", peerId }, peerId);
        break;
      }

      case "offer":
      case "answer": {
        const { targetPeerId, sdp } = msg;
        const targetPeer = getPeer(targetPeerId);
        if (!targetPeer || !myPeerId) return;

        const relayed: ServerMessage = {
          type: msg.type,
          fromPeerId: myPeerId,
          sdp,
        };
        send(targetPeer.socket, relayed);
        break;
      }

      case "ice-candidate": {
        const { targetPeerId, candidate } = msg;
        const targetPeer = getPeer(targetPeerId);
        if (!targetPeer || !myPeerId) return;

        send(targetPeer.socket, {
          type: "ice-candidate",
          fromPeerId: myPeerId,
          candidate,
        });
        break;
      }

      case "media-state": {
        if (!myPeerId) return;
        const room = getRoomOfPeer(myPeerId);
        if (!room) return;
        broadcastToRoom(room, {
          type: "media-state",
          fromPeerId: myPeerId,
          video: msg.video,
          audio: msg.audio,
          screenSharing: msg.screenSharing,
        }, myPeerId);
        break;
      }

      case "user-name": {
        if (!myPeerId) return;
        const room = getRoomOfPeer(myPeerId);
        if (!room) return;
        broadcastToRoom(room, {
          type: "user-name",
          fromPeerId: myPeerId,
          name: msg.name,
        }, myPeerId);
        break;
      }
    }
  };

  socket.onclose = () => {
    if (!myPeerId) return;
    const room = removePeer(myPeerId);
    if (room) {
      broadcastToRoom(room, { type: "user-left", peerId: myPeerId });
    }
  };

  socket.onerror = () => socket.close();
}
