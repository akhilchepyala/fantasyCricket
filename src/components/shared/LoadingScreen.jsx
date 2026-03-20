// src/components/shared/LoadingScreen.jsx
import React from "react";

export default function LoadingScreen() {
  return (
    <div className="screen-center">
      <div className="blob" />
      <div className="blob2" />
      <div className="spinner" />
      <p style={{ color: "var(--muted2)", fontSize: 13, letterSpacing: ".5px" }}>
        Connecting…
      </p>
    </div>
  );
}
