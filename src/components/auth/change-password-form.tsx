"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

import { AuthCard } from "./login-form";
import { PasswordInput } from "./password-input";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);

    if (!response.ok) {
      setError("Password could not be changed.");
      return;
    }

    await signOut({ redirect: false });
    router.push("/login?changed=1");
  }

  return (
    <AuthCard title="Change Temporary Password" subtitle="This is required before accessing the dashboard.">
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        <PasswordInput
          label="New Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
        />
        <PasswordInput
          label="Confirm Password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={loading || password.length < 8 || !confirm}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Change Password
        </button>
      </form>
    </AuthCard>
  );
}
