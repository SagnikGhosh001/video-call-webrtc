import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function HomePage() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState("");

  // After Create/Join is clicked, we store the pending room ID and show the name modal
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [name, setName] = useState(sessionStorage.getItem("vcName") ?? "");
  const [nameError, setNameError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const roomId = crypto.randomUUID();
    setPendingRoomId(roomId);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleJoin = () => {
    const id = joinId.trim();
    if (!id) {
      setJoinError("Please enter a room ID.");
      return;
    }
    setPendingRoomId(id);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleEnterRoom = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Please enter your name.");
      return;
    }
    sessionStorage.setItem("vcName", trimmed);
    navigate(`/room/${pendingRoomId}`, { state: { name: trimmed } });
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEnterRoom();
    if (e.key === "Escape") setPendingRoomId(null);
  };

  return (
    <div className="home-page">
      <h1>Video Call</h1>
      <p className="subtitle">Start a new room or join an existing one.</p>

      <div className="home-actions">
        <button className="btn-primary" onClick={handleCreate}>
          Create Room
        </button>

        <div className="divider">or</div>

        <div className="join-form">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={joinId}
            onChange={(e) => {
              setJoinId(e.target.value);
              setJoinError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          {joinError && <p className="error">{joinError}</p>}
          <button className="btn-secondary" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      </div>

      {pendingRoomId !== null && (
        <div className="modal-backdrop" onClick={() => setPendingRoomId(null)}>
          <div
            className="name-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
          >
            <h2>What's your name?</h2>
            <p className="modal-sub">Others in the room will see this.</p>
            <input
              ref={nameInputRef}
              type="text"
              className="name-input"
              placeholder="Your name"
              maxLength={32}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
            />
            {nameError && <p className="error">{nameError}</p>}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setPendingRoomId(null)}>
                Cancel
              </button>
              <button className="btn-primary modal-enter" onClick={handleEnterRoom}>
                Enter Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
