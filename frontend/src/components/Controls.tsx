type Props = {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
};

export function Controls({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: Props) {
  return (
    <div className="controls">
      <button
        className={`control-btn ${audioEnabled ? "" : "off"}`}
        onClick={onToggleAudio}
        title={audioEnabled ? "Mute mic" : "Unmute mic"}
      >
        {audioEnabled ? "Mic On" : "Mic Off"}
      </button>
      <button
        className={`control-btn ${videoEnabled ? "" : "off"}`}
        onClick={onToggleVideo}
        title={videoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {videoEnabled ? "Camera On" : "Camera Off"}
      </button>
      <button
        className={`control-btn ${isScreenSharing ? "screen-share-on" : ""}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
      >
        {isScreenSharing ? "Stop Sharing" : "Share Screen"}
      </button>
      <button className="control-btn leave-btn" onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}
