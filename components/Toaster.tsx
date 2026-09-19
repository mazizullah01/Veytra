"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon } from "./Icons";

interface Toast {
  id: number;
  title: string;
  message: string;
}

interface ToastInput {
  title?: string;
  message: string;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Fire a toast from anywhere: `const toast = useToast(); toast({ message })`. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      { id, title: input.title ?? "Added to cart", message: input.message },
    ]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toaster" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <span className="toast__icon">
              <CheckIcon size={18} />
            </span>
            <span className="toast__body">
              <span className="toast__title">{toast.title}</span>
              <br />
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
