"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";

import { AuthCard } from "./login-form";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPERADMIN">("ADMIN");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, role }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Registration failed.");
      return;
    }

    setMessage(data.message || "Registration request submitted.");
    setUsername("");
    setEmail("");
    setRole("ADMIN");
  }

  return (
    <AuthCard title="Request Access" subtitle="Superadmin approval is required before login.">
      <form onSubmit={submit} className="space-y-4">
        {message ? (
          <p className="rounded-[8px] bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        <label className="block text-sm font-bold text-slate-700">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
            placeholder="Arun Kumar"
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          Company Email ID
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
            placeholder="name@company.com"
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          Requested Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Super Admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={loading || !username.trim() || !email.trim()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Request
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already approved?{" "}
        <Link href="/login" className="font-bold text-indigo-600">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
