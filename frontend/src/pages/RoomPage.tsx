import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Controls } from "../components/Controls";
import { VideoGrid } from "../components/VideoGrid";
import { useMediaStream } from "../hooks/useMediaStream";
import { useWebRTC } from "../hooks/useWebRTC";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const localName: string =
    (location.state as { name?: string })?.name ||
    sessionStorage.getItem("vcName") ||
    "Anonymous";

  const {
    localStream,
    error,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    isScreenSharing,
    screenStream,
    startScreenShare,
    stopScreenShare,
  } = useMediaStream();

  const {
    peers,
    myPeerId,
    isConnected,
    roomFull,
    broadcastMediaState,
    addScreenShareTrack,
    removeScreenShareTrack,
    replaceAudioTrack,
  } = useWebRTC(roomId!, localStream, localName);

  const copiedRef = useRef(false);

  useEffect(() => {
    broadcastMediaState(videoEnabled, audioEnabled, isScreenSharing);
  }, [videoEnabled, audioEnabled, isScreenSharing, broadcastMediaState]);

  useEffect(() => {
    if (roomFull) {
      alert("This room is full. Returning to home.");
      navigate("/");
    }
  }, [roomFull, navigate]);

  const revertToCamera = async () => {
    removeScreenShareTrack();
    const micTrack = localStream?.getAudioTracks()[0] ?? null;
    await replaceAudioTrack(micTrack);
    broadcastMediaState(
      localStream?.getVideoTracks()[0]?.enabled ?? videoEnabled,
      localStream?.getAudioTracks()[0]?.enabled ?? audioEnabled,
      false,
    );
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      await revertToCamera();
    } else {
      const stream = await startScreenShare();
      if (!stream) return;

      const screenVideoTrack = stream.getVideoTracks()[0];
      const screenAudioTrack = stream.getAudioTracks()[0] ?? null;

      addScreenShareTrack(screenVideoTrack, stream);
      if (screenAudioTrack) await replaceAudioTrack(screenAudioTrack);
      broadcastMediaState(videoEnabled, audioEnabled, true);

      screenVideoTrack?.addEventListener("ended", async () => {
        stopScreenShare();
        await revertToCamera();
      }, { once: true });
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId ?? "");
    copiedRef.current = true;
  };

  if (error) {
    return (
      <div className="room-page">
        <div className="room-error">
          <p>Could not access camera/microphone: {error}</p>
          <button onClick={() => navigate("/")}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-info">
          <span className="room-id-label">Room:</span>
          <code className="room-id">{roomId}</code>
          <button className="copy-btn" onClick={copyRoomId} title="Copy room ID">
            Copy
          </button>
        </div>
        <div className="connection-info">
          <span className={`status-dot ${isConnected ? "connected" : ""}`} />
          <span>
            {peers.length + 1} participant{peers.length !== 0 ? "s" : ""}
          </span>
          <span className="my-id">{localName} · {myPeerId.slice(0, 6)}</span>
        </div>
      </header>

      <main className="room-main">
        <VideoGrid
          localStream={localStream}
          localScreenStream={screenStream}
          peers={peers}
          localVideoOn={videoEnabled}
          localAudioOn={audioEnabled}
          localScreenSharing={isScreenSharing}
          localName={localName}
        />
      </main>

      <Controls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeave={() => navigate("/")}
      />
    </div>
  );
}
