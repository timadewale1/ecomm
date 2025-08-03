// components/LinkAccountModal.jsx
import React, { useState } from "react";
import { RotatingLines } from "react-loader-spinner";

export default function LinkAccountModal({ open, onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!email || !pw) return alert("Please enter email and password.");
    if (pw.length < 6) return alert("Password must be at least 6 characters.");
    if (pw !== pw2) return alert("Passwords do not match.");
    try {
      setBusy(true);
      await onSubmit({ email: email.trim().toLowerCase(), password: pw });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/90 z-[8000]" onClick={onClose} />
      <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
          <h3 className="text-xl font-opensans font-semibold mb-1">Secure your account</h3>
          <p className="text-xs font-opensans mt-4 text-gray-600 mb-4">
            Link an email and password to convert your guest account without losing your cart or orders.
          </p>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 font-opensans text-base rounded-lg border focus:outline-none focus:border-amber-600"
            />
            <input
              type="password"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border font-opensans text-base focus:outline-none focus:border-amber-600"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border font-opensans text-base focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="mt-5 w-full h-11 rounded-full bg-customOrange font-opensans text-white font-semibold disabled:opacity-60 flex items-center justify-center"
          >
            {busy ? <RotatingLines width={20} strokeColor="#fff" /> : "Link account"}
          </button>
          <button
            onClick={onClose}
            className="mt-3 w-full h-10 rounded-full border  font-opensans  border-customRichBrown text-customRichBrown"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
