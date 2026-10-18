"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import styles from "./style-assistant.module.css";

const AssistantPanel = dynamic(() => import("./AssistantPanel"), { ssr: false,
  loading: () => <div className={styles.loading} role="status">Opening Veytra AI Fashion Stylist…</div> });

export default function StyleAssistant() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <>
    {loaded && <div hidden={!open}><AssistantPanel open={open} onClose={close} /></div>}
    <button ref={trigger} type="button" className={styles.launcher} aria-label={open ? "Minimize Veytra AI Fashion Stylist" : "Open Veytra AI Fashion Stylist"}
      aria-expanded={open} aria-controls={loaded ? "veytra-style-assistant" : undefined}
      onClick={() => { setLoaded(true); setOpen(value => !value); }}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        {open ? <path d="M6 6l12 12M18 6 6 18" /> : <><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2 1-6a8 8 0 1 1 17-4Z" /><path d="M7 10h10M7 14h6" /></>}
      </svg>
      <span>AI Fashion Stylist</span>
    </button>
  </>;
}
