// src/components/auth/LoginScreen.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import PinInput from "../shared/PinInput";

export default function LoginScreen({ db, currentMatchId, onAdminLogin, onMemberLogin }) {
  const forceAdmin = new URLSearchParams(window.location.search).get("admin") === "1";
  const [panel, setPanel] = useState(forceAdmin ? "admin" : "member");

  const [adminPin, setAdminPin] = useState("");
  const [adminErr, setAdminErr] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberPin, setMemberPin]   = useState("");
  const [memberErr, setMemberErr]   = useState("");

  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (forceAdmin) setPanel("admin");
  }, [forceAdmin]);

  // ── Admin login ──
  async function doAdminLogin() {
    try {
      const snap = await getDoc(doc(db, "meta", "game"));
      const gd   = snap.data() || {};
      if (adminPin === (gd.adminPin || "0000")) {
        onAdminLogin();
      } else {
        setAdminErr("Wrong PIN");
      }
    } catch (e) {
      setAdminErr("Error: " + e.message);
    }
  }

  // ── Member login ──
  async function doMemberLogin() {
    if (!memberName.trim()) { setMemberErr("Enter your name"); return; }
    if (memberPin.length !== 4) { setMemberErr("Enter your 4-digit PIN"); return; }
    try {
      const snap    = await getDoc(doc(db, "meta", "members"));
      const members = snap.data() || {};
      if (!members[memberName]) {
        setMemberErr("Name not found — use your join link to register");
        return;
      }
      if (members[memberName].pin !== memberPin) {
        setMemberErr("Wrong PIN");
        return;
      }
      // Load existing team for current match
      let loadedTeam = { players: [], captain: "", vc: "" };
      if (currentMatchId) {
        const mSnap = await getDoc(doc(db, "matches", currentMatchId));
        if (mSnap.exists()) {
          const t = (mSnap.data().teams || {})[memberName] || {};
          loadedTeam = { players: t.players || [], captain: t.captain || "", vc: t.vc || "" };
        }
      }
      onMemberLogin(memberName.trim(), loadedTeam);
    } catch (e) {
      setMemberErr("Error: " + e.message);
    }
  }

  function goJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    window.location.href = `${window.location.pathname}?join=${code}`;
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
        {/* Segment control */}
        <div className="seg">
          <button
            className={`seg-btn ${panel === "admin" ? "active" : ""}`}
            onClick={() => setPanel("admin")}
          >
            ⚙️ Admin
          </button>
          <button
            className={`seg-btn ${panel === "member" ? "active" : ""}`}
            onClick={() => setPanel("member")}
          >
            🏏 Player
          </button>
        </div>

        {/* ── Admin Panel ── */}
        {panel === "admin" && (
          <>
            <p className="fhint">League admin? Enter your 4-digit PIN.</p>
            <div className="field">
              <label>Admin PIN</label>
              <PinInput value={adminPin} onChange={setAdminPin} />
            </div>
            <div className="err">{adminErr}</div>
            <button className="btn-gold" onClick={doAdminLogin}>
              ADMIN LOGIN →
            </button>
            <p className="admin-tip">
              💡 Bookmark{" "}
              <b>
                {window.location.origin}
                {window.location.pathname}?admin=1
              </b>{" "}
              on your phone to always land on this screen.
            </p>
          </>
        )}

        {/* ── Member Panel ── */}
        {panel === "member" && (
          <>
            <p className="fhint">
              Already in the league? Log in below.
              <br />
              New player? Use the join link your admin sent.
            </p>
            <div className="field">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                autoComplete="off"
                onKeyDown={(e) => e.key === "Enter" && doMemberLogin()}
              />
            </div>
            <div className="field">
              <label>Your PIN</label>
              <PinInput value={memberPin} onChange={setMemberPin} />
            </div>
            <div className="err">{memberErr}</div>
            <button className="btn-gold" onClick={doMemberLogin}>
              LOG IN →
            </button>

            <div className="login-divider">or join with a code</div>
            <div className="field">
              <input
                type="text"
                maxLength={8}
                placeholder="Join code (e.g. IPL247)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  fontSize: 16,
                  textAlign: "center",
                }}
              />
            </div>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={goJoin}>
              JOIN WITH CODE →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
