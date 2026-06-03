import { useEffect, useRef, useState } from "react";
import { SignalingClient } from "../lib/signalingClient";
import { RTC_CONFIG, WS_URL } from "../lib/constants";
import type { ServerMessage } from "../lib/types";

export type PeerState = {
  peerId: string;
  stream: MediaStream;
  screenStream: MediaStream | null;
  videoOn: boolean;
  audioOn: boolean;
  screenSharing: boolean;
  name: string;
};

export function useWebRTC(
  roomId: string,
  localStream: MediaStream | null,
  localName: string,
) {
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomFull, setRoomFull] = useState(false);

  const myPeerIdRef = useRef<string>(crypto.randomUUID());
  const signalingRef = useRef<SignalingClient | null>(null);
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localNameRef = useRef<string>(localName);
  const peerStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerScreenStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerCameraStreamIdRef = useRef<Map<string, string>>(new Map());
  const peerMediaRef = useRef<Map<string, { videoOn: boolean; audioOn: boolean; screenSharing: boolean }>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const activeScreenRef = useRef<{ track: MediaStreamTrack; stream: MediaStream } | null>(null);
  const negotiatingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    localNameRef.current = localName;
  }, [localName]);

  const triggerRender = () => {
    const states: PeerState[] = [];
    for (const [peerId] of pcMapRef.current.entries()) {
      const stream = peerStreamsRef.current.get(peerId);
      if (stream) {
        const media = peerMediaRef.current.get(peerId) ?? { videoOn: true, audioOn: true, screenSharing: false };
        const name = peerNamesRef.current.get(peerId) ?? "Anonymous";
        const screenStream = peerScreenStreamsRef.current.get(peerId) ?? null;
        states.push({ peerId, stream, screenStream, ...media, name });
      }
    }
    setPeers(states);
  };

  const createPeerConnection = (remotePeerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcMapRef.current.set(remotePeerId, pc);
    if (!peerMediaRef.current.has(remotePeerId)) {
      peerMediaRef.current.set(remotePeerId, { videoOn: true, audioOn: true, screenSharing: false });
    }

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // If already screen sharing when a new peer joins, send the screen track too
    const activeScreen = activeScreenRef.current;
    if (activeScreen) {
      const sender = pc.addTrack(activeScreen.track, activeScreen.stream);
      screenSendersRef.current.set(remotePeerId, sender);
    }

    pc.onnegotiationneeded = async () => {
      if (negotiatingRef.current.has(remotePeerId)) return;
      if (pc.signalingState !== "stable") return;
      negotiatingRef.current.add(remotePeerId);
      try {
        const offer = await pc.createOffer();
        if (pc.signalingState !== "stable") return;
        await pc.setLocalDescription(offer);
        signalingRef.current?.send({
          type: "offer",
          targetPeerId: remotePeerId,
          sdp: pc.localDescription!,
        });
      } catch (err) {
        console.error("Renegotiation error:", err);
      } finally {
        negotiatingRef.current.delete(remotePeerId);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingRef.current?.send({
          type: "ice-candidate",
          targetPeerId: remotePeerId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;

      const knownCamStreamId = peerCameraStreamIdRef.current.get(remotePeerId);

      if (!knownCamStreamId || remoteStream.id === knownCamStreamId) {
        // Camera/audio stream (first stream, or same stream as already known)
        peerCameraStreamIdRef.current.set(remotePeerId, remoteStream.id);
        peerStreamsRef.current.set(remotePeerId, remoteStream);
      } else {
        // Different stream = screen share
        peerScreenStreamsRef.current.set(remotePeerId, remoteStream);
        event.track.addEventListener("ended", () => {
          peerScreenStreamsRef.current.delete(remotePeerId);
          triggerRender();
        });
      }

      triggerRender();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupPeer(remotePeerId);
      }
    };

    return pc;
  };

  const cleanupPeer = (peerId: string) => {
    const pc = pcMapRef.current.get(peerId);
    if (pc) {
      pc.close();
      pcMapRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
    peerMediaRef.current.delete(peerId);
    peerStreamsRef.current.delete(peerId);
    peerScreenStreamsRef.current.delete(peerId);
    peerCameraStreamIdRef.current.delete(peerId);
    screenSendersRef.current.delete(peerId);
    peerNamesRef.current.delete(peerId);
    triggerRender();
  };

  const drainCandidates = async (remotePeerId: string, pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current.get(remotePeerId) ?? [];
    pendingCandidatesRef.current.delete(remotePeerId);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore stale candidates
      }
    }
  };

  const broadcastMediaState = (video: boolean, audio: boolean, screenSharing = false) => {
    signalingRef.current?.send({ type: "media-state", video, audio, screenSharing });
  };

  const broadcastName = () => {
    signalingRef.current?.send({ type: "user-name", name: localNameRef.current });
  };

  const addScreenShareTrack = (track: MediaStreamTrack, stream: MediaStream) => {
    activeScreenRef.current = { track, stream };
    for (const [peerId, pc] of pcMapRef.current) {
      const sender = pc.addTrack(track, stream);
      screenSendersRef.current.set(peerId, sender);
    }
  };

  const removeScreenShareTrack = () => {
    activeScreenRef.current = null;
    for (const [peerId, pc] of pcMapRef.current) {
      const sender = screenSendersRef.current.get(peerId);
      if (sender) {
        try { pc.removeTrack(sender); } catch { /* ignore */ }
        screenSendersRef.current.delete(peerId);
      }
    }
  };

  const replaceAudioTrack = async (track: MediaStreamTrack | null) => {
    for (const [, pc] of pcMapRef.current) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) await sender.replaceTrack(track);
    }
  };

  const handleMessage = async (msg: ServerMessage) => {
    switch (msg.type) {
      case "room-joined": {
        setIsConnected(true);
        broadcastName();
        broadcastMediaState(
          localStreamRef.current?.getVideoTracks()[0]?.enabled ?? true,
          localStreamRef.current?.getAudioTracks()[0]?.enabled ?? true,
        );
        break;
      }

      case "user-joined": {
        broadcastName();
        broadcastMediaState(
          localStreamRef.current?.getVideoTracks()[0]?.enabled ?? true,
          localStreamRef.current?.getAudioTracks()[0]?.enabled ?? true,
          activeScreenRef.current !== null,
        );
        const pc = createPeerConnection(msg.peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signalingRef.current?.send({
          type: "offer",
          targetPeerId: msg.peerId,
          sdp: pc.localDescription!,
        });
        break;
      }

      case "offer": {
        const { fromPeerId, sdp } = msg;
        // Reuse existing PC for renegotiation; create new one if first connection
        let pc = pcMapRef.current.get(fromPeerId);
        if (!pc) {
          pc = createPeerConnection(fromPeerId);
        }
        await pc.setRemoteDescription(sdp as RTCSessionDescriptionInit);
        await drainCandidates(fromPeerId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingRef.current?.send({
          type: "answer",
          targetPeerId: fromPeerId,
          sdp: pc.localDescription!,
        });
        break;
      }

      case "answer": {
        const { fromPeerId, sdp } = msg;
        const pc = pcMapRef.current.get(fromPeerId);
        if (!pc) return;
        await pc.setRemoteDescription(sdp as RTCSessionDescriptionInit);
        await drainCandidates(fromPeerId, pc);
        break;
      }

      case "ice-candidate": {
        const { fromPeerId, candidate } = msg;
        const pc = pcMapRef.current.get(fromPeerId);
        if (!pc || !pc.remoteDescription) {
          const list = pendingCandidatesRef.current.get(fromPeerId) ?? [];
          list.push(candidate as RTCIceCandidateInit);
          pendingCandidatesRef.current.set(fromPeerId, list);
          return;
        }
        try {
          await pc.addIceCandidate(candidate as RTCIceCandidateInit);
        } catch {
          // ignore
        }
        break;
      }

      case "media-state": {
        peerMediaRef.current.set(msg.fromPeerId, {
          videoOn: msg.video,
          audioOn: msg.audio,
          screenSharing: msg.screenSharing ?? false,
        });
        triggerRender();
        break;
      }

      case "user-name": {
        peerNamesRef.current.set(msg.fromPeerId, msg.name);
        triggerRender();
        break;
      }

      case "user-left": {
        cleanupPeer(msg.peerId);
        break;
      }

      case "room-full": {
        setRoomFull(true);
        break;
      }

      case "error": {
        console.error("Signaling error:", msg.message);
        break;
      }
    }
  };

  useEffect(() => {
    if (!localStream) return;

    const client = new SignalingClient();
    signalingRef.current = client;

    client.onMessage((msg) => {
      handleMessage(msg).catch(console.error);
    });

    client.onClose(() => {
      setIsConnected(false);
    });

    client
      .connect(WS_URL)
      .then(() => {
        client.send({
          type: "join",
          roomId,
          peerId: myPeerIdRef.current,
        });
      })
      .catch((err) => {
        console.error("Failed to connect to signaling server:", err);
      });

    return () => {
      for (const [, pc] of pcMapRef.current) {
        pc.close();
      }
      pcMapRef.current.clear();
      pendingCandidatesRef.current.clear();
      peerMediaRef.current.clear();
      peerStreamsRef.current.clear();
      peerScreenStreamsRef.current.clear();
      peerCameraStreamIdRef.current.clear();
      screenSendersRef.current.clear();
      client.disconnect();
      setIsConnected(false);
      setPeers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, localStream]);

  return {
    peers,
    myPeerId: myPeerIdRef.current,
    isConnected,
    roomFull,
    broadcastMediaState,
    addScreenShareTrack,
    removeScreenShareTrack,
    replaceAudioTrack,
  };
}
