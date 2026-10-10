"use client";

import { useState, type FormEvent } from "react";
import { authRequest } from "@/lib/insforge-client";

type Tab = "signin" | "signup";

export default function LoginView() {
  const [tab, setTab] = useState<Tab>("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const destination = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/profile";
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();
    const enteredPassword = String(fields.get("password") ?? "");
    if (enteredPassword.length < 8) { setMessage("Use a password with at least 8 characters."); return; }
    setBusy(true); setMessage("");
    try {
      if (tab === "signup") {
        const result = await authRequest<{
          user: unknown;
          requireEmailVerification?: boolean;
        }>("/api/auth/sign-up", {
          email,
          password: enteredPassword,
          name: String(fields.get("name") ?? "").trim(),
          redirectTo: window.location.origin + "/login",
        });
        if (result.requireEmailVerification) {
          setVerificationEmail(email); setPassword(enteredPassword);
          setMessage("Check your email for the verification code or link.");
          return;
        }
      } else {
        await authRequest("/api/auth/sign-in", { email, password: enteredPassword });
      }
      window.location.assign(destination());
    } catch (error) {
      const statusCode = error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 0;
      if (statusCode === 403) {
        setVerificationEmail(email); setPassword(enteredPassword);
        setMessage("Verify your email to sign in. You can resend your verification code below.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await authRequest("/api/auth/verify-email", { email: verificationEmail, otp: code });
      await authRequest("/api/auth/sign-in", { email: verificationEmail, password });
      window.location.assign(destination());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true);
    try {
      await authRequest(
        "/api/auth/verify-email",
        { email: verificationEmail, redirectTo: window.location.origin + "/login" },
        "PUT",
      );
      setMessage("Verification email sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <p className="auth__brand">VEYTRA</p>
        <p className="auth__intro">
          {tab === "signin"
            ? "Welcome back. Sign in to your account."
            : "Create an account for faster checkout and order updates."}
        </p>

        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signin"}
            className={`tab ${tab === "signin" ? "is-active" : ""}`}
            onClick={() => {
              setTab("signin");
              setMessage(""); setVerificationEmail("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signup"}
            className={`tab ${tab === "signup" ? "is-active" : ""}`}
            onClick={() => {
              setTab("signup");
              setMessage(""); setVerificationEmail("");
            }}
          >
            Create Account
          </button>
        </div>

        {message && <p className="auth__alt" role="status">{message}</p>}
        {verificationEmail ? (
          <form onSubmit={verify}>
            <div className="field"><label htmlFor="verification-code">Verification code</label>
              <input id="verification-code" value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required />
            </div>
            <button className="btn btn--solid btn--block auth__submit" disabled={busy}><span>{busy ? "Please wait…" : "Verify email"}</span></button>
            <p className="auth__alt"><button type="button" onClick={resend} disabled={busy}>Resend code</button></p>
            <p className="auth__alt"><button type="button" onClick={() => { setVerificationEmail(""); setTab("signin"); }}>Back to sign in</button></p>
          </form>
        ) : tab === "signin" ? (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email" name="email" autoComplete="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password" name="password" autoComplete="current-password" minLength={8}
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn btn--solid btn--block auth__submit"
            >
              <span>{busy ? "Signing in…" : "Sign In"}</span>
            </button>

          </form>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="signup-name">Full name</label>
              <input id="signup-name" name="name" autoComplete="name" placeholder="Jane Doe" required />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email" name="email" autoComplete="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password" name="password" autoComplete="new-password" minLength={8}
                type="password"
                placeholder="At least 8 characters"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn btn--solid btn--block auth__submit"
            >
              <span>{busy ? "Creating account…" : "Create Account"}</span>
            </button>

          </form>
        )}

        <p className="auth__alt">
          {tab === "signin" ? (
            <>
              New to VEYTRA?{" "}
              <button type="button" onClick={() => setTab("signup")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("signin")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
