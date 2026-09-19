"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <div className="field">
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" required />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" rows={5} required />
      </div>
      <button type="submit" className="btn btn--solid">
        <span>Send message</span>
      </button>
      {sent && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Thank you — this is a demo, so no message was actually sent.
        </p>
      )}
    </form>
  );
}
