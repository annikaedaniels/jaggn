"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────
//  Broadcast dialogs — top-right transmission log.
//
//  Every time data leaves the browser (Stripe session, order
//  confirmation, Kit subscribe) we open a "pending" dialog, then
//  resolve it to success/error. Success auto-fades; errors linger
//  longer; pending stays until resolved. All are closable.
// ─────────────────────────────────────────────────────────────

export type ToastStatus = "pending" | "success" | "error";

export type ToastInit = {
  status: ToastStatus;
  title: string;
  detail?: string;
  /** ms before auto-dismiss; 0 = stay until closed/updated */
  duration?: number;
};

type Toast = ToastInit & { id: string };

type ToastApi = {
  notify: (t: ToastInit) => string;
  update: (id: string, patch: Partial<ToastInit>) => void;
  dismiss: (id: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// Pending waits on the network, so it never self-dismisses.
function defaultDuration(status: ToastStatus) {
  if (status === "pending") return 0;
  return status === "success" ? 4000 : 7000;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((list) => list.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const schedule = useCallback(
    (id: string, duration: number) => {
      clearTimer(id);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
    },
    [clearTimer, dismiss],
  );

  const notify = useCallback(
    (init: ToastInit) => {
      const id = newId();
      const duration = init.duration ?? defaultDuration(init.status);
      setToasts((list) => [...list, { ...init, id, duration }]);
      schedule(id, duration);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, patch: Partial<ToastInit>) => {
      setToasts((list) =>
        list.map((t) => {
          if (t.id !== id) return t;
          const status = patch.status ?? t.status;
          const duration = patch.duration ?? defaultDuration(status);
          return { ...t, ...patch, status, duration };
        }),
      );
      const status = patch.status;
      if (status) schedule(id, patch.duration ?? defaultDuration(status));
    },
    [schedule],
  );

  // Any dialog still counting down when the provider unmounts would leave a
  // live timer pointing at dead state.
  useEffect(() => {
    const timeouts = timers.current;
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

  const api = useMemo(
    () => ({ notify, update, dismiss }),
    [notify, update, dismiss],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismiss}
        onHold={clearTimer}
        onRelease={schedule}
      />
    </ToastCtx.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
  onHold,
  onRelease,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onHold: (id: string) => void;
  onRelease: (id: string, duration: number) => void;
}) {
  return (
    // Sits below the boot overlay (z-100) but above the checkout modal (z-70).
    // Insets keep it clear of the notch and rounded corners on phones.
    <div className="toast-viewport pointer-events-none z-[95] flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onDismiss={onDismiss}
            onHold={onHold}
            onRelease={onRelease}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onHold,
  onRelease,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
  onHold: (id: string) => void;
  onRelease: (id: string, duration: number) => void;
}) {
  const reduce = useReducedMotion();
  const { id, status, title, detail, duration = 0 } = toast;

  const motionProps = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 24, transition: { duration: 0.25 } },
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
      };

  const marker =
    status === "success" ? "✓" : status === "error" ? "!" : "●";

  return (
    <motion.div
      layout={!reduce}
      {...motionProps}
      // Hovering holds the dialog open so it can be read.
      onMouseEnter={() => onHold(id)}
      onMouseLeave={() => onRelease(id, duration)}
      className="toast-scan pointer-events-auto relative overflow-hidden border border-gray/25 bg-ink/95 backdrop-blur-sm"
      role={status === "error" ? "alert" : "status"}
      aria-live={status === "error" ? "assertive" : "polite"}
    >
      {/* status spine */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${
          status === "pending" ? "bg-gray/40" : "bg-signal"
        }`}
      />

      <div className="flex items-start gap-3 py-3 pl-4 pr-3">
        <span
          aria-hidden
          className={`mt-[2px] font-sans text-[11px] ${
            status === "pending" ? "animate-pulse text-gray" : "text-signal"
          }`}
        >
          {marker}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="font-sans text-[11px] uppercase text-gray tracking-nav"
          >
            {title}
          </p>
          {detail && (
            <p className="mt-1 break-words font-sans text-[11px] leading-snug text-grayDim">
              {detail}
            </p>
          )}
        </div>

        <button
          onClick={() => onDismiss(id)}
          aria-label="Close notification"
          className="shrink-0 font-sans text-[11px] text-grayDim transition-colors hover:text-signal"
        >
          ✕
        </button>
      </div>

      {/* pending: sliding tuning bar. resolved: countdown to auto-fade. */}
      {status === "pending" ? (
        <div aria-hidden className="relative h-[2px] overflow-hidden bg-gray/10">
          <span className="toast-slider absolute inset-y-0 w-1/3 bg-signal/70" />
        </div>
      ) : duration > 0 ? (
        <div aria-hidden className="h-[2px] bg-gray/10">
          <span
            className="toast-progress block h-full bg-signal/70"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      ) : null}
    </motion.div>
  );
}
