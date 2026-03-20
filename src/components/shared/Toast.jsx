// src/components/shared/Toast.jsx
import React from "react";

export default function Toast({ toast }) {
  return (
    <div
      className={`toast ${toast.show ? "show" : ""} ${
        toast.type === "err" ? "toast-err" : "toast-ok"
      }`}
    >
      {toast.msg}
    </div>
  );
}
