import type { ServerMessage } from "./types.ts";

export const MAX_ROOM_SIZE = 8;

export type Peer = {
  peerId: string;
  socket: WebSocket;
};

export type Room = {
  roomId: string;
  peers: Map<string, Peer>;
};

const rooms = new Map<string, Room>();

export function createOrGetRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { roomId, peers: new Map() });
  }
  return rooms.get(roomId)!;
}

export function addPeer(roomId: string, peer: Peer): "ok" | "full" {
  const room = createOrGetRoom(roomId);
  if (room.peers.size >= MAX_ROOM_SIZE) return "full";
  room.peers.set(peer.peerId, peer);
  return "ok";
}

export function removePeer(peerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.peers.has(peerId)) {
      room.peers.delete(peerId);
      if (room.peers.size === 0) {
        rooms.delete(room.roomId);
      }
      return room;
    }
  }
  return undefined;
}

export function getRoomOfPeer(peerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.peers.has(peerId)) return room;
  }
  return undefined;
}

export function getPeer(peerId: string): Peer | undefined {
  for (const room of rooms.values()) {
    const peer = room.peers.get(peerId);
    if (peer) return peer;
  }
  return undefined;
}

export function broadcastToRoom(
  room: Room,
  message: ServerMessage,
  excludePeerId?: string,
): void {
  const data = JSON.stringify(message);
  for (const peer of room.peers.values()) {
    if (peer.peerId === excludePeerId) continue;
    if (peer.socket.readyState === WebSocket.OPEN) {
      peer.socket.send(data);
    }
  }
}
