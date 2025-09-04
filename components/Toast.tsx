import React, { createContext, useContext, ReactNode } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple console logging for now - can be enhanced later
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const showError = (message: string) => showToast(message, 'error');
  const showSuccess = (message: string) => showToast(message, 'success');

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}