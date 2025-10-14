import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

interface ToastManagerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

// Individual Toast Component
const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const { id, message: text, type, duration = 4000 } = message;

  // Auto-close after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  // Get styling based on toast type (using inline styles to avoid CSS conflicts)
  const getToastStyles = () => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '8px',
      minWidth: '300px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      borderLeft: '4px solid',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 300ms ease-out',
      transform: 'translateY(0)',
      opacity: 1
    };

    let typeStyles = {};
    switch (type) {
      case 'success':
        typeStyles = {
          backgroundColor: '#f0fdf4',
          borderLeftColor: '#84cc16',
          color: '#365314'
        };
        break;
      case 'error':
        typeStyles = {
          backgroundColor: '#fef2f2',
          borderLeftColor: '#f87171',
          color: '#7f1d1d'
        };
        break;
      case 'warning':
        typeStyles = {
          backgroundColor: '#fffbeb',
          borderLeftColor: '#f59e0b',
          color: '#78350f'
        };
        break;
      case 'info':
      default:
        typeStyles = {
          backgroundColor: '#eff6ff',
          borderLeftColor: '#3b82f6',
          color: '#1e3a8a'
        };
        break;
    }
    
    return { ...baseStyle, ...typeStyles };
  };

  // Get icon based on toast type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div style={getToastStyles()}>
      <span style={{ fontSize: '18px', marginRight: '12px' }}>{getIcon()}</span>
      <span style={{ flex: 1, fontWeight: '500' }}>{text}</span>
      <button
        onClick={() => onClose(id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          opacity: 0.7,
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginLeft: '12px',
          padding: '0',
          lineHeight: 1
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

// Toast Manager Component with Portal
export const ToastManager: React.FC<ToastManagerProps> = ({ toasts, onClose }) => {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create or get the toast container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.pointerEvents = 'none'; // Allow clicks to pass through the container
      document.body.appendChild(container);
    }
    setPortalContainer(container);
  }, []);

  if (!portalContainer || toasts.length === 0) {
    return null;
  }


  const toastContent = (
    <div 
      style={{ 
        position: 'fixed',
        top: '16px',
        right: '16px',
        maxWidth: '320px',
        zIndex: 2147483647,
        pointerEvents: 'none'
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );

  return createPortal(toastContent, portalContainer);
};

// Toast Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastMessage = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message: string, duration?: number) => addToast(message, 'success', duration);
  const error = (message: string, duration?: number) => addToast(message, 'error', duration);
  const warning = (message: string, duration?: number) => addToast(message, 'warning', duration);
  const info = (message: string, duration?: number) => addToast(message, 'info', duration);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
};

export default Toast;
