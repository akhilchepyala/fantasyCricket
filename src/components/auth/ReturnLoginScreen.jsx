// src/components/auth/ReturnLoginScreen.jsx
import React, { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import PinInput from "../shared/PinInput";

export default function ReturnLoginScreen({ db, currentMatchId, onLogin, onBack }) {
  const [name, setName]       = useState("");
  const [pin, setPin]         = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    if (!name.trim())        { setErr("Enter your name"); return; }
    if (pin.length !== 4)    { setErr("Enter 4-digit PIN"); return; }

    setLoading(true);
    try {
      const snap    = await getDoc(doc(db, "meta", "members"));
      const members = snap.data() || {};
      if (!members[name.trim()]) {
        setErr("Name not found — use your join link"); setLoading(false); return;
      }
      if (members[name.trim()].pin !== pin) {
        setErr("Wrong PIN"); setLoading(false); return;
      }

      let loadedTeam = { players: [], captain: "", vc: "" };
      if (currentMatchId) {
        const mSnap = await getDoc(doc(db, "matches", currentMatchId));
        if (mSnap.exists()) {
          const t = (mSnap.data().teams || {})[name.trim()] || {};
          loadedTeam = { players: t.players || [], captain: t.captain || "", vc: t.vc || "" };
        }
      }
      onLogin(name.trim(), loadedTeam);
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
          Welcome back 👋
        </p>

        <div className="field">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
          />
        </div>

        <div className="field">
          <label>Your PIN</label>
          <PinInput value={pin} onChange={setPin} />
        </div>

        <div className="err">{err}</div>

        <button className="btn-gold" onClick={doLogin} disabled={loading}>
          {loading ? "Logging in…" : "LOG IN →"}
        </button>

        <button
          className="btn-ghost"
          style={{ width: "100%", marginTop: 8 }}
          onClick={onBack}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
