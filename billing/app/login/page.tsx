"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { billingApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await billingApi.login(email, password);
      const loggedInUser = data?.admin || data?.user || null;
      if (!loggedInUser) {
        throw new Error("Login response is missing user details");
      }
      setUser(loggedInUser);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitLogin();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="pos-card w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-black/30 border border-[var(--border)] grid place-items-center text-[var(--gold)] font-bold">
            SW
          </div>
          <div>
            <h1 className="text-xl font-semibold">SOWAAT POS</h1>
            <p className="text-sm text-[var(--text-secondary)]">Point of Sale System</p>
          </div>
        </div>

        <div className="space-y-3">
          <input className="pos-input w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="pos-input w-full" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void submitLogin()}
          className="w-full h-12 rounded-lg font-bold text-black bg-[var(--gold)] hover:bg-[var(--gold-hover)] disabled:opacity-60"
        >
          {loading ? "Signing in..." : "SIGN IN"}
        </button>

        {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      </form>
    </main>
  );
}
