"use client";
import { useState } from "react";

export default function LoginPage() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setErr("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const j = await r.json();
    if (j.success) {
      window.location.href = "/attendance";
    } else {
      setErr(j.error || "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8E8E4", padding: "32px 28px", width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#E8540A" }}>Gharpayy</span>
          <div style={{ fontSize: 14, color: "#999", marginTop: 4 }}>Employee Operations</div>
        </div>
        <input
          placeholder="Username"
          value={u} onChange={e => setU(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #E8E8E4", borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: "border-box" as const }}
        />
        <input
          type="password" placeholder="Password"
          value={p} onChange={e => setP(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #E8E8E4", borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: "border-box" as const }}
        />
        {err && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12, background: "#FCEBEB", padding: "8px 12px", borderRadius: 8 }}>{err}</div>}
        <button onClick={login} disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: "#E8540A", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: "#BBB", textAlign: "center" }}>
          superadmin / Admin@1234
        </div>
      </div>
    </div>
  );
}