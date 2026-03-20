// src/components/shared/PinInput.jsx
import React, { useRef } from "react";

export default function PinInput({ value, onChange }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const digits = ((value || "") + "    ").split("").slice(0, 4);

  function handleChange(i, v) {
    const d = v.replace(/\D/, "").slice(0, 1);
    const arr = [...digits];
    arr[i] = d;
    onChange(arr.join("").trimEnd());
    if (d && i < 3) refs[i + 1].current?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  }

  return (
    <div className="pin-row">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === " " ? "" : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
