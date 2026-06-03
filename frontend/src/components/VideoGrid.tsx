import type { PeerState } from "../hooks/useWebRTC";
import { VideoTile } from "./VideoTile";

type Props = {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  peers: PeerState[];
  localVideoOn: boolean;
  localAudioOn: boolean;
  localScreenSharing: boolean;
  localName: string;
};

function getColumns(total: number): number {
  if (total <= 1) return 1;
  if (total <= 2) return 2;
  if (total <= 4) return 2;
  if (total <= 6) return 3;
  return 4;
}

export function VideoGrid({
  localStream,
  localScreenStream,
  peers,
  localVideoOn,
  localAudioOn,
  localScreenSharing,
  localName,
}: Props) {
  // Find the first active screen share: local takes priority, then first remote peer
  const remoteSharingPeer = peers.find((p) => p.screenSharing && p.screenStream);
  const anyoneSharing = localScreenSharing || remoteSharingPeer !== undefined;

  if (anyoneSharing) {
    const isLocalSharing = localScreenSharing;
    const mainStream = isLocalSharing ? localScreenStream : remoteSharingPeer!.screenStream;
    const mainLabel = isLocalSharing
      ? `${localName}'s screen`
      : `${remoteSharingPeer!.name}'s screen`;

    return (
      <div className="presentation-layout">
        <div className="presentation-main">
          <VideoTile
            stream={mainStream}
            label={mainLabel}
            muted={isLocalSharing}
            videoOn
            isScreen
          />
        </div>
        <div className="presentation-sidebar">
          <VideoTile
            stream={localStream}
            label={localName}
            muted
            videoOn={localVideoOn}
            audioOn={localAudioOn}
          />
          {peers.map((peer) => (
            <VideoTile
              key={peer.peerId}
              stream={peer.stream}
              label={peer.name}
              videoOn={peer.videoOn}
              audioOn={peer.audioOn}
            />
          ))}
        </div>
      </div>
    );
  }

  // Normal grid mode
  const total = peers.length + 1;
  const columns = getColumns(total);

  return (
    <div
      className="video-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      <VideoTile
        stream={localStream}
        label={localName}
        muted
        videoOn={localVideoOn}
        audioOn={localAudioOn}
      />
      {peers.map((peer) => (
        <VideoTile
          key={peer.peerId}
          stream={peer.stream}
          label={peer.name}
          videoOn={peer.videoOn}
          audioOn={peer.audioOn}
          screenSharing={peer.screenSharing}
        />
      ))}
    </div>
  );
}
