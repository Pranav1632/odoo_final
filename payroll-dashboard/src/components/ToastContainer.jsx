import { useState, useCallback, useEffect } from 'react';

const toastState = {
  toasts: [],
  listeners: [],
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  
  notify() {
    this.listeners.forEach(l => l(this.toasts));
  },
  
  add(toast) {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast, duration: toast.duration ?? 4000 };
    this.toasts = [...this.toasts, newToast];
    this.notify();
    
    if (newToast.duration > 0) {
      setTimeout(() => this.remove(id), newToast.duration);
    }
    
    return id;
  },
  
  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  },
  
  success(message, options) {
    return this.add({ type: 'success', message, ...options });
  },
  
  error(message, options) {
    return this.add({ type: 'error', message, ...options });
  },
  
  warning(message, options) {
    return this.add({ type: 'warning', message, ...options });
  },
  
  info(message, options) {
    return this.add({ type: 'info', message, ...options });
  },
};

export function useToast() {
  const [toasts, setToasts] = useState(toastState.toasts);

  useEffect(() => toastState.subscribe(setToasts), []);
  
  const toast = useCallback((options) => {
    if (typeof options === 'string') {
      return toastState.info(options);
    }
    return toastState.add(options);
  }, []);
  
  toast.success = useCallback((message, options) => toastState.success(message, options), []);
  toast.error = useCallback((message, options) => toastState.error(message, options), []);
  toast.warning = useCallback((message, options) => toastState.warning(message, options), []);
  toast.info = useCallback((message, options) => toastState.info(message, options), []);
  
  return { toasts, toast };
}

export function ToastContainer() {
  const { toasts } = useToast();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast animate-slide-in ${{
            success: 'toast-success',
            error: 'toast-error',
            warning: 'toast-warning',
            info: 'toast-info',
          }[toast.type]}`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => toastState.remove(toast.id)} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}