"use client";

import { useState, type FormEvent } from "react";

type Tab = "signin" | "signup";

export default function LoginView() {
  const [tab, setTab] = useState<Tab>("signin");
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <p className="auth__brand">VELOUR</p>
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
              setSubmitted(false);
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
              setSubmitted(false);
            }}
          >
            Create Account
          </button>
        </div>

        {tab === "signin" ? (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="auth__meta">
              <label
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  textTransform: "none",
                  letterSpacing: 0,
                  fontSize: "0.78rem",
                }}
              >
                <input type="checkbox" /> Remember me
              </label>
              <button type="button">Forgot password?</button>
            </div>
            <button
              type="submit"
              className="btn btn--solid btn--block auth__submit"
            >
              <span>Sign In</span>
            </button>
            {submitted && (
              <p className="auth__alt">
                This is a demo — authentication is not connected.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="signup-name">Full name</label>
              <input id="signup-name" placeholder="Jane Doe" required />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                placeholder="At least 8 characters"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn--solid btn--block auth__submit"
            >
              <span>Create Account</span>
            </button>
            {submitted && (
              <p className="auth__alt">
                This is a demo — no account was created.
              </p>
            )}
          </form>
        )}

        <p className="auth__alt">
          {tab === "signin" ? (
            <>
              New to VELOUR?{" "}
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
