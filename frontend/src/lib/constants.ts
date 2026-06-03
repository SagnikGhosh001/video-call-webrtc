const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
// Use same host+port as the page — Vite proxies /ws → backend
export const WS_URL = `${wsProtocol}//${window.location.host}/ws`;

export const MAX_ROOM_SIZE = 8;

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};
