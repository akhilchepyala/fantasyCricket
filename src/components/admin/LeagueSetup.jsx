// src/components/admin/LeagueSetup.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function LeagueSetup({
  db,
  metaGame,
  allMembers,
  allTeams,
  currentMatchId,
  currentMatch,
  showToast,
  onPickMyTeam,
}) {
  const [adminPin, setAdminPin]           = useState(metaGame.adminPin || "0000");
  const [adminPlayerName, setAdminPlayerName] = useState(metaGame.adminProfile?.name || "");
  const [adminTeamName, setAdminTeamName]     = useState(metaGame.adminProfile?.teamName || "");

  useEffect(() => {
    setAdminPin(metaGame.adminPin || "0000");
    setAdminPlayerName(metaGame.adminProfile?.name || "");
    setAdminTeamName(metaGame.adminProfile?.teamName || "");
  }, [metaGame]);

  const adminProfile  = metaGame.adminProfile || {};
  const hasProfile    = !!adminProfile.name;
  const myAdminTeam   = hasProfile ? (allTeams[adminProfile.name] || {}) : {};
  const hasMatch      = !!currentMatchId && !currentMatch.finalized && !currentMatch.revealed;
  const joinLink      = metaGame.joinCode
    ? `${window.location.origin}${window.location.pathname}?join=${metaGame.joinCode}`
    : "";

  function genCode() {
    return (
      Math.random().toString(36).substring(2, 5).toUpperCase() +
      Math.random().toString(36).substring(2, 5).toUpperCase()
    );
  }

  async function saveLeague() {
    await updateDoc(doc(db, "meta", "game"), { adminPin });
    showToast("Saved ✓");
  }

  async function saveProfile() {
    if (!adminPlayerName.trim()) { showToast("Enter your player name", "err"); return; }
    const mSnap   = await getDoc(doc(db, "meta", "members"));
    const members = mSnap.data() || {};
    members[adminPlayerName.trim()] = {
      pin:      "__admin__",
      teamName: adminTeamName.trim() || adminPlayerName.trim() + "'s XI",
      joinedAt: Date.now(),
      isAdmin:  true,
    };
    await setDoc(doc(db, "meta", "members"), members);
    await updateDoc(doc(db, "meta", "game"), {
      adminProfile: {
        name:     adminPlayerName.trim(),
        teamName: adminTeamName.trim() || adminPlayerName.trim() + "'s XI",
      },
    });
    showToast("Profile saved! You're in the league ✓");
  }

  async function generateJoinLink() {
    const code = genCode();
    await updateDoc(doc(db, "meta", "game"), { joinCode: code });
    showToast("Join link created!");
  }

  async function regenCode() {
    if (!window.confirm("New code? Old link stops working.")) return;
    const code = genCode();
    await updateDoc(doc(db, "meta", "game"), { joinCode: code });
    showToast("New code generated");
  }

  function copyLink() {
    navigator.clipboard
      .writeText(joinLink)
      .then(() => showToast("Copied!"))
      .catch(() => showToast("Copy failed", "err"));
  }

  return (
    <div className="admin-2col">
      {/* LEFT */}
      <div className="acol">

        {/* League settings */}
        <div className="acard">
          <div className="acard-t">⚙️ League Settings</div>
          <div className="field">
            <label>Admin PIN</label>
            <input
              type="text"
              maxLength={4}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
            />
          </div>
          <button className="btn-sm" onClick={saveLeague}>
            Save
          </button>
        </div>

        {/* Admin player profile */}
        <div className="acard">
          <div className="acard-t">🏏 My Player Profile</div>
          <p className="muted" style={{ marginBottom: 12 }}>
            Set up your player identity so you can also participate in the league as a player.
          </p>
          <div className="field">
            <label>Your Name (as a player)</label>
            <input
              type="text"
              value={adminPlayerName}
              onChange={(e) => setAdminPlayerName(e.target.value)}
              placeholder="e.g. Sai"
            />
          </div>
          <div className="field">
            <label>Your Team Name</label>
            <input
              type="text"
              value={adminTeamName}
              onChange={(e) => setAdminTeamName(e.target.value)}
              placeholder="e.g. Sai's XI"
            />
          </div>
          <button className="btn-sm" onClick={saveProfile}>
            Save Profile
          </button>

          {hasProfile && (
            <>
              <div className="admin-profile-status">
                <span className="ap-name">👤 {adminProfile.name}</span>
                <span className="ap-team">{adminProfile.teamName || "–"}</span>
                {myAdminTeam.submitted ? (
                  <span className="pill pill-green" style={{ fontSize: 11 }}>
                    ✓ Team submitted
                  </span>
                ) : (
                  <span
                    className="pill"
                    style={{
                      background: "rgba(242,180,17,.1)",
                      color: "var(--gold)",
                      border: "1px solid rgba(242,180,17,.3)",
                      fontSize: 11,
                    }}
                  >
                    Team not picked
                  </span>
                )}
              </div>

              {hasMatch && (
                <button
                  className="btn-reveal"
                  style={{ fontSize: 15, marginTop: 10, width: "100%" }}
                  onClick={onPickMyTeam}
                >
                  🏏 PICK MY TEAM FOR THIS MATCH
                </button>
              )}
              {!hasMatch && currentMatch.revealed && (
                <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Match already revealed — wait for the next match to pick your team.
                </p>
              )}
              {!currentMatchId && (
                <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Create a match first, then come back here to pick your team.
                </p>
              )}
            </>
          )}

          {!hasProfile && (
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Save your profile above to start playing.
            </p>
          )}
        </div>

        {/* Invite friends */}
        <div className="acard">
          <div className="acard-t">🔗 Invite Friends</div>
          {metaGame.joinCode ? (
            <>
              <div className="join-badge">{metaGame.joinCode}</div>
              <div className="jlink-box">
                <span style={{ flex: 1, wordBreak: "break-all" }}>{joinLink}</span>
                <button className="btn-copy" onClick={copyLink}>
                  Copy
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Share this link. Friends tap it to register.
              </p>
              <button className="btn-sm" style={{ marginTop: 10 }} onClick={regenCode}>
                New Code
              </button>
            </>
          ) : (
            <>
              <p className="muted">Generate a join link to invite friends.</p>
              <button
                className="btn-gold"
                style={{ marginTop: 12, fontSize: 16, padding: 11 }}
                onClick={generateJoinLink}
              >
                GENERATE JOIN LINK
              </button>
            </>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="acol">
        <div className="acard">
          <div className="acard-t">
            👥 All Members ({Object.keys(allMembers).length})
          </div>
          {Object.keys(allMembers).length === 0 && (
            <p className="muted">No members yet.</p>
          )}
          {Object.entries(allMembers).map(([name, m]) => (
            <div key={name} className="mrow">
              <span className="mrow-n">{name}</span>
              <span className="mrow-s s-yes">{m.teamName || "–"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
