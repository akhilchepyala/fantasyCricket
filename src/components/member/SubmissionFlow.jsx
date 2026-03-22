// src/components/member/SubmissionFlow.jsx
import React, { useState, useEffect } from "react";
import MyTeamCard from "./MyTeamCard";
import TeamBuilder from "./TeamBuilder";
import XIPanel from "./XIPanel";
import ConfirmStep from "./ConfirmStep";
import { saveDraftTeam, submitTeam } from "../../firebase/db";
import { validateTeam } from "../../utils/team";

export default function SubmissionFlow({
  db,
  currentMatchId,
  currentMatch,
  matchPlayers,
  allTeams,
  allMembers,
  session,
  isIPL,
  localTeam,
  setLocalTeam,
  showToast,
}) {
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [started, setStarted] = useState(false); // landing → builder
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Derived state ──
  const locked = currentMatch?.locked || currentMatch?.finalized || false;
  const revealed = currentMatch?.revealed || currentMatch?.finalized || false;
  const rawTeam = allTeams?.[session] || {};
  const myTeam = {
    players: Array.isArray(rawTeam.players) ? rawTeam.players : [],
    captain: typeof rawTeam.captain === "string" ? rawTeam.captain : "",
    vc: typeof rawTeam.vc === "string" ? rawTeam.vc : "",
    submitted: rawTeam.submitted === true,
    submittedAt:
      typeof rawTeam.submittedAt === "number" ? rawTeam.submittedAt : 0,
    updatedAt: typeof rawTeam.updatedAt === "number" ? rawTeam.updatedAt : 0,
  };
  const submitted = myTeam.submitted;

  // ── Auto-save draft (debounced 1500 ms) ──
  useEffect(() => {
    if (locked || !currentMatchId || !session || localTeam.players.length === 0)
      return;
    setSaving(true);
    const timer = setTimeout(async () => {
      try {
        await saveDraftTeam(db, currentMatchId, session, localTeam);
        setSaving(false);
        setSaveError(false);
      } catch (err) {
        setSaving(false);
        setSaveError(true);
        showToast(err.message || "Failed to save draft", "err");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [localTeam.players, localTeam.captain, localTeam.vc, currentMatchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status label ──
  function renderStatusLabel() {
    if (locked) return <span className="pill pill-red">🔒 Locked</span>;
    if (revealed && !locked)
      return <span className="pill pill-amber">🥁 Toss Done</span>;
    return <span className="pill pill-green">🟢 Open</span>;
  }

  // ── Match bar ──
  function renderMatchBar() {
    return (
      <div className="match-bar">
        <div>
          <div className="match-label-sm">CURRENT MATCH</div>
          <div className="match-title">{currentMatch?.label || "—"}</div>
        </div>
        {renderStatusLabel()}
      </div>
    );
  }

  // ── Locked banner ──
  function renderLockedBanner() {
    if (!locked) return null;
    return (
      <div className="info-banner red">
        <div className="ib-icon">🔒</div>
        <div className="ib-title">
          Match Locked — no further changes allowed
        </div>
      </div>
    );
  }

  // ── Step indicator ──
  function renderStepIndicator() {
    return (
      <div className="step-indicator">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`step-dot ${step === s ? "step-dot-active" : step > s ? "step-dot-done" : ""}`}
          >
            {s}
          </div>
        ))}
        <div className="step-label">
          {step === 1 && "Build XI"}
          {step === 2 && "Preview & Pick Captain"}
          {step === 3 && "Confirm & Submit"}
        </div>
        {saving && <span className="save-indicator saving">Saving…</span>}
        {!saving && !saveError && localTeam.players.length > 0 && (
          <span className="save-indicator saved">✓ Saved</span>
        )}
        {saveError && (
          <span className="save-indicator save-err">⚠ Save failed</span>
        )}
      </div>
    );
  }

  // ── Branch 1: NoMatch ──
  if (!currentMatchId) {
    return (
      <div className="empty-state">
        <div className="es-icon">🏏</div>
        <p>No match set up yet.</p>
        <p className="muted">Your admin will set up the next match soon.</p>
      </div>
    );
  }

  // ── Branch 2: DeadlinePassed (locked + not submitted) ──
  if (locked && !submitted) {
    return (
      <>
        {renderMatchBar()}
        {renderLockedBanner()}
        <div className="info-banner red">
          <div className="ib-icon">⚠️</div>
          <div>
            <div className="ib-title">Deadline Passed</div>
            <div className="ib-sub">
              You didn't submit a team for this match.
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Branch 3: ReadOnly (locked + submitted) ──
  if (locked && submitted) {
    return (
      <>
        {renderMatchBar()}
        {renderLockedBanner()}
        <MyTeamCard
          team={myTeam}
          match={currentMatch}
          memberName={session}
          allMembers={allMembers}
          matchPlayers={matchPlayers}
          onEditTeam={() => {}}
        />
      </>
    );
  }

  // ── Branch 3.5: Open + submitted (not editing) ──
  function handleEditTeam() {
    const savedTeam = allTeams[session] || {};
    setLocalTeam({
      players: Array.isArray(savedTeam.players) ? savedTeam.players : [],
      captain: typeof savedTeam.captain === "string" ? savedTeam.captain : "",
      vc: typeof savedTeam.vc === "string" ? savedTeam.vc : "",
    });
    setStep(1);
    setEditing(true);
  }

  if (!locked && submitted && !editing) {
    return (
      <>
        {renderMatchBar()}
        <MyTeamCard
          team={myTeam}
          match={currentMatch}
          memberName={session}
          allMembers={allMembers}
          matchPlayers={matchPlayers}
          onEditTeam={handleEditTeam}
        />
      </>
    );
  }

  // ── Branch 3.75: Landing card (not yet started building) ──
  if (!started) {
    const draftCount = localTeam.players.length;
    return (
      <>
        {renderMatchBar()}
        <div className="landing-card">
          <div className="lc-icon">🏏</div>
          <div className="lc-title">Build Your XI</div>
          <div className="lc-sub">
            Pick 11 players, assign a Captain &amp; Vice-Captain, then submit
            before the match starts.
          </div>
          {draftCount > 0 && (
            <div className="lc-draft">
              Draft in progress — {draftCount}/11 players selected
            </div>
          )}
          <button
            className="btn-lock"
            style={{ marginTop: 16 }}
            onClick={() => {
              setStep(1);
              setStarted(true);
            }}
          >
            {draftCount > 0 ? "Continue Building →" : "Start Building →"}
          </button>
        </div>
      </>
    );
  }

  // ── Branch 4: Step flow (open match, or editing after submission) ──
  async function handleSubmit() {
    if (submitting) return;
    const err = validateTeam(localTeam, matchPlayers, isIPL);
    if (err) {
      showToast(err, "err");
      return;
    }
    // Guard: re-check lock state before submitting
    if (currentMatch?.locked || currentMatch?.finalized) {
      showToast("Match is locked — submission not allowed", "err");
      return;
    }
    setSubmitting(true);
    try {
      await submitTeam(db, currentMatchId, session, localTeam);
      setSubmitting(false);
      setEditing(false);
      setStarted(false);
    } catch (e) {
      setSubmitting(false);
      showToast(e.message || "Submission failed", "err");
    }
  }

  return (
    <>
      {renderMatchBar()}
      {renderStepIndicator()}

      {/* Step 1: TeamBuilder */}
      {step === 1 && (
        <>
          <TeamBuilder
            db={db}
            currentMatchId={currentMatchId}
            localTeam={{ ...localTeam, _memberName: session }}
            setLocalTeam={setLocalTeam}
            pool={matchPlayers}
            isIPL={isIPL}
            submitted={submitted}
            showToast={showToast}
          />
          <div style={{ marginTop: 12 }}>
            {localTeam.players.length !== 11 && (
              <p className="muted" style={{ marginBottom: 6 }}>
                Need {11 - localTeam.players.length} more
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-back"
                onClick={() => {
                  if (editing) setEditing(false);
                  else setStarted(false);
                }}
              >
                ← Back
              </button>
              <button
                className="btn-lock"
                onClick={() => setStep(2)}
                disabled={localTeam.players.length !== 11}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Step 2: XIPanel — Preview & Pick Captain */}
      {step === 2 && (
        <>
          <XIPanel
            selected={localTeam.players}
            captain={localTeam.captain}
            vc={localTeam.vc}
            pool={matchPlayers}
            onRemove={(p) =>
              setLocalTeam((t) => ({
                ...t,
                players: t.players.filter((x) => x !== p),
              }))
            }
            onChangeCaptain={(p) => setLocalTeam((t) => ({ ...t, captain: p }))}
            onChangeVC={(p) => setLocalTeam((t) => ({ ...t, vc: p }))}
            onLock={() => {}}
            submitted={submitted}
            hideLock={true}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-back" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              className="btn-lock"
              onClick={() => setStep(3)}
              disabled={
                !localTeam.captain ||
                !localTeam.vc ||
                localTeam.captain === localTeam.vc
              }
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Step 3: ConfirmStep */}
      {step === 3 && (
        <ConfirmStep
          team={localTeam}
          matchPlayers={matchPlayers}
          onSubmit={handleSubmit}
          onBack={() => setStep(2)}
          submitting={submitting}
        />
      )}
    </>
  );
}
