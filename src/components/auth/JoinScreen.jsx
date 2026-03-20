// src/components/auth/JoinScreen.jsx
import React, { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import PinInput from "../shared/PinInput";

export default function JoinScreen({ db, urlJoinCode, onJoined, onReturnLogin }) {
  const [name, setName]         = useState("");
  const [teamName, setTeamName] = useState("");
  const [pin, setPin]           = useState("");
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);

  async function doJoin() {
    if (!name.trim())                        { setErr("Enter your name"); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setErr("Choose a 4-digit PIN"); return; }

    setLoading(true);
    try {
      // Validate join code
      const gameSnap = await getDoc(doc(db, "meta", "game"));
      const gd = gameSnap.data() || {};
      if ((gd.joinCode || "").toUpperCase() !== (urlJoinCode || "").toUpperCase()) {
        setErr("Invalid join code"); setLoading(false); return;
      }

      // Check/create member
      const mSnap   = await getDoc(doc(db, "meta", "members"));
      const members = mSnap.data() || {};
      if (members[name.trim()] && members[name.trim()].pin !== pin) {
        setErr("Name taken — use a different name or correct PIN");
        setLoading(false);
        return;
      }

      members[name.trim()] = {
        pin,
        teamName: teamName.trim() || name.trim() + "'s Team",
        joinedAt: Date.now(),
      };
      await setDoc(doc(db, "meta", "members"), members);

      // Clean URL then navigate into app
      window.history.replaceState({}, "", window.location.pathname);
      onJoined(name.trim());
    } catch (e) {
      setErr("Error: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="screen-center">
      <div className="blob" />
      <div className="blob2" />

      <div className="login-hero">
        <div className="hero-ipl-sm">IPL</div>
        <div style={{ width: 2, height: 36, background: "var(--accent)", flexShrink: 0 }} />
        <div className="hero-right-text">
          <div className="hero-title-sm">FANTASY LEAGUE</div>
          <div className="hero-sub">PRIVATE · FRIENDS ONLY</div>
        </div>
      </div>

      <div className="card">
        <p className="brand-sub" style={{ textAlign: "center", marginBottom: 14 }}>
          You've been invited! 🎉
        </p>

        <div className="join-badge">{(urlJoinCode || "").toUpperCase()}</div>

        <div className="field">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="e.g. Rahul"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>
            Team Name <span className="hint">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Chennai Champions"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>
            Choose a 4-digit PIN{" "}
            <span className="hint">(to log back in)</span>
          </label>
          <PinInput value={pin} onChange={setPin} />
        </div>

        <div className="err">{err}</div>

        <button className="btn-gold" onClick={doJoin} disabled={loading}>
          {loading ? "Joining…" : "JOIN & PICK TEAM →"}
        </button>

        <button
          className="btn-ghost"
          style={{ width: "100%", marginTop: 8 }}
          onClick={onReturnLogin}
        >
          Already joined? Log back in
        </button>
      </div>
    </div>
  );
}
