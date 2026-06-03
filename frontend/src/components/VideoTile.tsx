import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  videoOn?: boolean;
  audioOn?: boolean;
  screenSharing?: boolean;
  isScreen?: boolean;
};

function ProfileIcon() {
  return (
    <div className="profile-avatar">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="32" cy="24" r="14" fill="#6b7280" />
        <ellipse cx="32" cy="56" rx="22" ry="14" fill="#6b7280" />
      </svg>
    </div>
  );
}

function CamOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Camera off">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Mic off">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Screen sharing">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function VideoTile({
  stream,
  label,
  muted = false,
  videoOn = true,
  audioOn = true,
  screenSharing = false,
  isScreen = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      video.play().catch(() => {});
    }
  }, [stream]);

  const showVideo = videoOn && stream !== null;

  return (
    <div className={`video-tile${isScreen ? " screen-tile" : ""}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ display: showVideo ? "block" : "none" }}
      />
      {!showVideo && <ProfileIcon />}
      <div className="tile-overlay">
        <span className="tile-label">{label}</span>
        <div className="tile-indicators">
          {!audioOn && (
            <span className="indicator mic-off" title="Microphone off">
              <MicOffIcon />
            </span>
          )}
          {!videoOn && !isScreen && (
            <span className="indicator cam-off" title="Camera off">
              <CamOffIcon />
            </span>
          )}
          {screenSharing && !isScreen && (
            <span className="indicator screen-share" title="Screen sharing">
              <ScreenShareIcon />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
