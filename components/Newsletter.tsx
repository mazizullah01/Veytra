"use client";

import { useState, type FormEvent } from "react";

/** UI-only newsletter capture. No network calls. */
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setDone(true);
    setEmail("");
  };

  return (
    <section className="newsletter">
      <div className="container">
        <span className="eyebrow eyebrow--light">The Veytra List</span>
        <h2>First access, quietly delivered.</h2>
        <p>
          Join for early previews, private sales and styling notes. No noise —
          unsubscribe any time.
        </p>
        <form className="newsletter__form" onSubmit={submit}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            aria-label="Email address"
          />
          <button type="submit">Subscribe</button>
        </form>
        {done && (
          <p className="newsletter__status">
            Thank you — you&apos;re on the list.
          </p>
        )}
      </div>
    </section>
  );
}
