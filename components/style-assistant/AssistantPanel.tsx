"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import AppLink from "@/components/AppLink";
import Img from "@/components/Img";
import { CloseIcon } from "@/components/Icons";
import { useAuth } from "@/lib/store";
import { money } from "@/lib/format";
import { QUICK_REPLIES, WELCOME, type AssistantReply, type ChatMessage, type SearchContext } from "@/lib/style-assistant/types";
import styles from "./style-assistant.module.css";

let messageSequence = 0;
const messageId = () => `${Date.now()}-${++messageSequence}`;
const welcome = (): ChatMessage => ({ id: messageId(), role: "assistant", timestamp: Date.now(), text: WELCOME,
  reply: { text: WELCOME, context: {}, quickReplies: QUICK_REPLIES } });

export default function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome()]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [retryText, setRetryText] = useState("");
  const [searchContext, setSearchContext] = useState<SearchContext>({});
  const context = useRef<SearchContext>({});
  const field = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);
  const version = useRef(0);
  const { user, loading } = useAuth();
  const owner = useRef<string | null>(null);
  const authReady = useRef(false);

  const reset = () => {
    version.current++; pending.current?.abort(); pending.current = null;
    setBusy(false); setFailure(""); setRetryText(""); setMessages([welcome()]);
    context.current = {}; setSearchContext({}); setInput("");
  };
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    const node = log.current;
    if (open && node) node.scrollTo({ top: node.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, busy, open]);
  useEffect(() => () => { version.current++; pending.current?.abort(); }, []);
  useEffect(() => {
    if (loading) return;
    const next = user?.id ?? null;
    if (authReady.current && owner.current !== next) {
      version.current++; pending.current?.abort(); pending.current = null;
      setMessages([welcome()]); setBusy(false); setFailure(""); setRetryText("");
      context.current = {}; setSearchContext({}); setInput("");
    }
    authReady.current = true; owner.current = next;
  }, [user?.id, loading]);

  const send = async (text: string, retry = false) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 600 || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const current = ++version.current;
    setInput(""); setBusy(true); setFailure(""); setRetryText("");
    if (!retry) setMessages(previous => [...previous, { id: messageId(), role: "user" as const, text: trimmed, timestamp: Date.now() }].slice(-24));
    const timer = window.setTimeout(() => controller.abort("timeout"), 28_000);
    try {
      const response = await fetch("/api/chat", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed, context: context.current, history: messages.filter(m => m.text !== WELCOME && !m.reply?.private && !(m.role === "user" && m.text === trimmed && retry)).slice(-8).map(m => ({ role: m.role, text: m.text.slice(0, 700) })) }), signal: controller.signal });
      const reply = await response.json() as AssistantReply & { error?: string };
      if (!response.ok) throw new Error(reply.error ?? "Unable to reach the assistant. Please try again.");
      if (current !== version.current) return;
      context.current = reply.context; setSearchContext(reply.context);
      setMessages(previous => [...previous, { id: messageId(), role: "assistant" as const, timestamp: Date.now(), text: reply.text, reply }].slice(-24));
    } catch (error) {
      if (current !== version.current) return;
      setFailure(controller.signal.aborted ? "The store took too long to respond. Please try again." : error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setRetryText(trimmed);
    } finally {
      window.clearTimeout(timer);
      if (current === version.current) { pending.current = null; setBusy(false); }
    }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const latest = [...messages].reverse().find(message => message.reply)?.reply;
  const activeFilters = Object.entries(searchContext).filter(([key, value]) => key !== "currency" && key !== "maxExclusive" && value !== undefined);

  return <section id="veytra-style-assistant" hidden={!open} className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="style-assistant-title"
    onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className={styles.header}>
      <div><p className={styles.brand}>VEYTRA</p><h2 id="style-assistant-title">AI Fashion Stylist</h2><p className={styles.subtitle}>Personal styling · English / اردو / Roman Urdu</p></div>
      <div className={styles.headerActions}>
        <button type="button" onClick={reset} className={styles.clear}>Clear chat</button>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Minimize assistant"><CloseIcon size={18} /></button>
      </div>
    </header>
    <div ref={log} className={styles.log} role="log" aria-label="Style assistant conversation" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
      {messages.map(message => <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}>
        <span className={styles.speaker}>{message.role === "user" ? "You" : "Veytra"}</span>
        <p dir="auto">{message.text}</p>
        {message.reply?.products?.map(product => <AppLink key={product.id} href={`/product/${encodeURIComponent(product.id)}`} className={styles.product} onClick={onClose}>
          <div className={styles.productImage}><Img src={product.image || "/images/placeholder.jpg"} alt={product.name} fill sizes="64px" /></div>
          <div><strong>{product.name}</strong><span>{money(product.price)}</span><small>Listed sizes: {product.sizes.join(", ") || "Not supplied"}</small><small className={styles.view}>View product →</small></div>
        </AppLink>)}
        {!!message.reply?.links?.length && <div className={styles.links}>{message.reply.links.map(link => <AppLink href={link.href} key={link.href} onClick={onClose}>{link.label} →</AppLink>)}</div>}
        <time dateTime={new Date(message.timestamp).toISOString()}>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </article>)}
      {busy && <p className={styles.typing} role="status"><span /><span /><span />Styling your answer…</p>}
      {failure && <div className={styles.error} role="alert"><p>{failure}</p><button type="button" disabled={busy} onClick={() => void send(retryText, true)}>Try again</button><AppLink href="/men" onClick={onClose}>Browse the shop</AppLink></div>}
    </div>
    <div className={styles.composer}>
      {!!activeFilters.length && <div className={styles.filters}><span>Current search: {activeFilters.map(([key, value]) => `${key.replace("Price", " price")}: ${value}`).join(" · ")}{searchContext.currency ? ` · ${searchContext.currency}` : " · USD"}</span>
        <button type="button" disabled={busy} onClick={() => void send("Clear filters")}>Reset</button></div>}
      <div className={styles.quickReplies} aria-label="Suggested questions">{(latest?.quickReplies ?? QUICK_REPLIES).map(text => <button key={text} type="button" disabled={busy} onClick={() => void send(text)}>{text}</button>)}</div>
      <form onSubmit={submit} className={styles.form}>
        <label htmlFor="style-assistant-message" className="sr-only">Message Veytra Style Assistant</label>
        <input ref={field} id="style-assistant-message" value={input} onChange={event => setInput(event.target.value)} maxLength={600} placeholder="Ask about outfits, colors or styling…" autoComplete="off" enterKeyHint="send" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send message">Send</button>
      </form>
      <p className={styles.disclaimer}>Messages go to Google Gemini and may improve its services. Avoid personal details. AI can make mistakes.</p>
    </div>
  </section>;
}
