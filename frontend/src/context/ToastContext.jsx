import { createContext, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

function toneStyles(tone) {
  if (tone === 'error') return 'border-red-200 bg-red-50 text-red-800';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const removeToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const pushToast = ({ title, message, tone = 'success' }) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, title, message, tone }]);
    window.setTimeout(() => removeToast(id), 4000);
  };

  return (
    <ToastContext.Provider value={{ pushToast, removeToast }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-3 shadow-lg ${toneStyles(toast.tone)} slide-down`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                {toast.title ? <p className="font-semibold">{toast.title}</p> : null}
                {toast.message ? <p className="text-sm">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
                onClick={() => removeToast(toast.id)}
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
