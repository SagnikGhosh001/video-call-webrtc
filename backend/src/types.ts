// Client → Server
export type ClientJoinMessage = {
  type: "join";
  roomId: string;
  peerId: string;
};

export type ClientOfferMessage = {
  type: "offer";
  targetPeerId: string;
  sdp: unknown;
};

export type ClientAnswerMessage = {
  type: "answer";
  targetPeerId: string;
  sdp: unknown;
};

export type ClientIceCandidateMessage = {
  type: "ice-candidate";
  targetPeerId: string;
  candidate: unknown;
};

export type ClientMediaStateMessage = {
  type: "media-state";
  video: boolean;
  audio: boolean;
  screenSharing?: boolean;
};

export type ClientUserNameMessage = {
  type: "user-name";
  name: string;
};

export type ClientMessage =
  | ClientJoinMessage
  | ClientOfferMessage
  | ClientAnswerMessage
  | ClientIceCandidateMessage
  | ClientMediaStateMessage
  | ClientUserNameMessage;

// Server → Client
export type ServerRoomJoinedMessage = {
  type: "room-joined";
  roomId: string;
  peerId: string;
  existingPeers: string[];
};

export type ServerUserJoinedMessage = {
  type: "user-joined";
  peerId: string;
};

export type ServerUserLeftMessage = {
  type: "user-left";
  peerId: string;
};

export type ServerOfferMessage = {
  type: "offer";
  fromPeerId: string;
  sdp: unknown;
};

export type ServerAnswerMessage = {
  type: "answer";
  fromPeerId: string;
  sdp: unknown;
};

export type ServerIceCandidateMessage = {
  type: "ice-candidate";
  fromPeerId: string;
  candidate: unknown;
};

export type ServerMediaStateMessage = {
  type: "media-state";
  fromPeerId: string;
  video: boolean;
  audio: boolean;
  screenSharing?: boolean;
};

export type ServerUserNameMessage = {
  type: "user-name";
  fromPeerId: string;
  name: string;
};

export type ServerRoomFullMessage = {
  type: "room-full";
  maxSize: number;
};

export type ServerErrorMessage = {
  type: "error";
  message: string;
};

export type ServerMessage =
  | ServerRoomJoinedMessage
  | ServerUserJoinedMessage
  | ServerUserLeftMessage
  | ServerOfferMessage
  | ServerAnswerMessage
  | ServerIceCandidateMessage
  | ServerMediaStateMessage
  | ServerUserNameMessage
  | ServerRoomFullMessage
  | ServerErrorMessage;
