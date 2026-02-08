'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  direction: 'long' | 'short';
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, direction: 'long' | 'short') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text, direction }]);
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

export function ToastContainer({ toasts, onDismiss }: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast-enter bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl shadow-black/40 p-4 flex items-start gap-3"
        >
          <span className="text-lg flex-shrink-0">
            {toast.direction === 'long' ? '📈' : '📉'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-100">New Signal</div>
            <div className="text-xs text-zinc-400 mt-0.5 truncate">{toast.text}</div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-500 hover:text-zinc-300 text-sm flex-shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
          {/* Auto-dismiss progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800 rounded-b-lg overflow-hidden">
            <div className={`h-full ${toast.direction === 'long' ? 'bg-emerald-500' : 'bg-red-500'} toast-progress`} />
          </div>
        </div>
      ))}
    </div>
  );
}
