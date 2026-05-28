"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info' | 'success';
};

type ConfirmContextType = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'primary' | 'danger' | 'warning' | 'info' | 'success';
  resolve: (value: boolean) => void;
}

const defaultState: ConfirmState = {
  isOpen: false,
  title: "ยืนยันการทำรายการ",
  message: "",
  confirmText: "ตกลง",
  cancelText: "ยกเลิก",
  variant: "primary",
  resolve: () => {}
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(defaultState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const confirm = useCallback((options: string | ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === "string") {
        setState({
          isOpen: true,
          title: "ยืนยันการทำรายการ",
          message: options,
          confirmText: "ยืนยัน",
          cancelText: "ยกเลิก",
          variant: "primary",
          resolve
        });
      } else {
        setState({
          isOpen: true,
          title: options.title || "ยืนยันการทำรายการ",
          message: options.message,
          confirmText: options.confirmText || "ยืนยัน",
          cancelText: options.cancelText || "ยกเลิก",
          variant: options.variant || "primary",
          resolve
        });
      }
    });
  }, []);

  const handleClose = (value: boolean) => {
    state.resolve(value);
    setState(defaultState);
  };

  const getIcon = (variant: string) => {
    switch (variant) {
      case "danger": return "⚠️";
      case "warning": return "📙";
      case "success": return "✅";
      case "info": return "ℹ️";
      default: return "❓";
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.isOpen) {
        handleClose(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isOpen, state.resolve]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.isOpen && mounted && createPortal(
        <div className="confirm-backdrop" onClick={() => handleClose(false)}>
          <div className={`confirm-modal variant-${state.variant}`} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <span className="confirm-icon">{getIcon(state.variant)}</span>
              <h3 className="confirm-title">{state.title}</h3>
            </div>
            <div className="confirm-message">{state.message}</div>
            <div className="confirm-actions">
              <button className="confirm-btn-cancel btn" onClick={() => handleClose(false)}>
                {state.cancelText}
              </button>
              <button className={`confirm-btn-submit btn variant-${state.variant}`} onClick={() => handleClose(true)}>
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}
