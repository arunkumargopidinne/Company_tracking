"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Building2, Loader2, LogIn } from "lucide-react";

import { getFirebaseClientConfig, getFirebaseGoogleAuth } from "@/lib/firebase-client";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const urlError = searchParams.get("error");
  const changed = searchParams.get("changed");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [error, setError] = useState(() => loginErrorMessage(urlError));
  const firebaseEnabled = Boolean(getFirebaseClientConfig());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        login,
        password,
        redirect: false,
        callbackUrl,
      });

      handleSignInResult(result);
    } catch {
      setError("Login failed. Please check your details and retry.");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithFirebaseGoogle() {
    const auth = getFirebaseGoogleAuth();

    if (!auth) {
      setError("Firebase Google login is not configured yet.");
      return;
    }

    setFirebaseLoading(true);
    setError("");

    try {
      const firebaseResult = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await firebaseResult.user.getIdToken();
      const result = await signIn("firebase-google", {
        idToken,
        redirect: false,
        callbackUrl,
      });

      handleSignInResult(result);
    } catch (firebaseError) {
      if (
        firebaseError instanceof Error &&
        firebaseError.message.includes("auth/popup-closed-by-user")
      ) {
        setError("Google login was closed before completion.");
      } else {
        setError("Google login failed. Please retry or contact superadmin.");
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  function handleSignInResult(result: Awaited<ReturnType<typeof signIn>>) {
    if (!result) {
      setError("Login service did not respond. Please retry.");
      return;
    }

    if (!result.ok || result.error || isAuthErrorUrl(result.url)) {
      setError(loginErrorMessage(result.error) || "Invalid login details.");
      return;
    }

    router.push(getSafeCallbackUrl(result.url) || callbackUrl);
    router.refresh();
  }

  return (
    <AuthCard title="Sign in" subtitle="Use your approved User ID or company email.">
      <form onSubmit={submit} className="space-y-4">
        {changed ? (
          <p className="rounded-[8px] bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            Password changed. Please login with your new password.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        <label className="block text-sm font-bold text-slate-700">
          Email or User ID
          <input
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoComplete="username"
            className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
            placeholder="admin@company.com"
          />
        </label>
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Enter your password"
        />
        <button
          type="submit"
          disabled={loading || !login.trim() || !password}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </button>
      </form>

      {firebaseEnabled ? (
        <button
          type="button"
          onClick={continueWithFirebaseGoogle}
          disabled={firebaseLoading}
          className="mt-3 h-11 w-full rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
        >
          {firebaseLoading ? "Opening Google..." : "Continue with Google"}
        </button>
      ) : null}

      <p className="mt-4 text-center text-sm text-slate-600">
        Need admin access?{" "}
        <Link href="/register" className="font-bold text-indigo-600">
          Register for approval
        </Link>
      </p>
    </AuthCard>
  );
}

function loginErrorMessage(error: string | null) {
  if (!error) return "";
  if (error === "CredentialsSignin") return "Invalid login details.";
  if (error.includes("ACCOUNT_PENDING")) return "Your account is waiting for superadmin approval.";
  if (error.includes("ACCOUNT_DISABLED") || error === "disabled") {
    return "This account is disabled. Contact superadmin.";
  }
  if (error.includes("FIREBASE_ADMIN_NOT_CONFIGURED")) {
    return "Firebase Google login is not configured on the server.";
  }
  if (error.includes("USE_PASSWORD_LOGIN")) {
    return "This account uses User ID/password login. Please sign in with your approved credentials.";
  }
  if (error === "OAuthSignin" || error === "OAuthCallback" || error === "FirebaseSignin") {
    return "Google sign-in failed. Please retry or contact superadmin.";
  }
  if (error === "AccessDenied") {
    return "Access denied for this account.";
  }
  return "Unable to login. Please check your details and retry.";
}

function getSafeCallbackUrl(value: string | null | undefined) {
  if (!value) return "/dashboard";

  try {
    const parsed = value.startsWith("http")
      ? new URL(value)
      : new URL(value, "http://localhost");
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (path.startsWith("/api/auth") || path.startsWith("/login")) {
      return "/dashboard";
    }

    return path;
  } catch {
    return "/dashboard";
  }
}

function isAuthErrorUrl(value: string | null | undefined) {
  if (!value) return false;

  return value.includes("/api/auth/error") || value.includes("error=");
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4 py-10">
      <section className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-indigo-600 text-white">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-950">{title}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
