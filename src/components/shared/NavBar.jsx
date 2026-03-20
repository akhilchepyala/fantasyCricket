// src/components/shared/NavBar.jsx
import React from "react";

export default function NavBar({
  session,
  isAdmin,
  onLogout,
  onBackToAdmin,
  onPickMyTeam,
}) {
  const adminInPlayerMode = isAdmin && session;
  return (
    <>
      <div className="hero-banner">
        <div className="hero-left">
          <div className="hero-ipl">IPL</div>
          <div className="hero-divider" />
          <div className="hero-right-text">
            <div className="hero-title">FANTASY LEAGUE</div>
            <div className="hero-sub">PRIVATE · FRIENDS ONLY</div>
          </div>
        </div>
        <div className="hero-season">IPL 2025</div>
      </div>

      <nav className="topnav">
        <div className="nav-brand">
          {isAdmin && !adminInPlayerMode ? (
            <span className="admin-badge">⚙️ Admin Panel</span>
          ) : adminInPlayerMode ? (
            <span className="admin-badge">Admin · Player Mode</span>
          ) : (
            <span className="nav-hi">🏏 My League</span>
          )}
        </div>
        <div className="nav-r">
          {session && <span className="nav-u">👤 {session}</span>}
          {isAdmin && !adminInPlayerMode && onPickMyTeam && (
            <button
              className="btn-sm"
              style={{
                borderColor: "rgba(0,212,255,.4)",
                color: "var(--cyan)",
              }}
              onClick={onPickMyTeam}
            >
              🏏 My Team
            </button>
          )}
          {adminInPlayerMode && (
            <button
              className="btn-sm"
              style={{
                borderColor: "rgba(0,212,255,.4)",
                color: "var(--cyan)",
              }}
              onClick={onBackToAdmin}
            >
              ← Admin
            </button>
          )}
          {!adminInPlayerMode && (
            <button className="btn-ghost btn-signout" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
