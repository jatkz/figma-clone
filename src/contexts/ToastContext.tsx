import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useToast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';

// Toast Context Interface
interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

// Create Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
    </ToastContext.Provider>
  );
};

// Custom hook to use Toast Context
export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  
  return context;
};

// Helper function to convert context methods to the canvas hook format
export const createToastFunction = (toastContext: ToastContextType) => {
  return (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration?: number) => {
    switch (type) {
      case 'success':
        return toastContext.success(message, duration);
      case 'error':
        return toastContext.error(message, duration);
      case 'warning':
        return toastContext.warning(message, duration);
      case 'info':
      default:
        return toastContext.info(message, duration);
    }
  };
};

export default ToastContext;
