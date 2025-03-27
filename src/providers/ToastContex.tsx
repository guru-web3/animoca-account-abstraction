"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  duration: number;
  onClose: () => void;
  onClick?: () => void;
}

const Toast = ({ message, type, duration, onClose, onClick }: ToastProps) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-[2%] left-1/2 -translate-y-1/2 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px] animate-fadeIn">
      <div
        className={`bg-white dark:bg-gray-800 border border-gray-800 rounded-lg shadow-lg px-4 py-3 flex items-center ${
          onClick ? "cursor-pointer" : ""
        }`}
        onClick={onClick}
      >
        {type === "error" && (
          <div className="bg-red-500 rounded-full p-1 mr-3">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}
        {type === "success" && (
          <div className="bg-green-600 rounded-full p-1 mr-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          </div>
        )}
        {/* ... (other type icons remain the same) ... */}
        <span className="text-white flex-grow">{message}</span>
        {onClick && (
          <div className="rounded-full p-1 mr-3">
            <svg
              className="h-5 w-5 text-white ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

interface ToastContextProps {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    onClick?: () => void
  ) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<
    Array<{
      id: number;
      message: string;
      type: ToastType;
      duration: number;
      onClick?: () => void;
    }>
  >([]);

  const showToast = (
    message: string,
    type: ToastType = "info",
    duration = 3000,
    onClick?: () => void
  ) => {
    const id = Date.now();
    setToasts((prevToasts) => [
      ...prevToasts,
      { id, message, type, duration, onClick },
    ]);
  };

  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
            onClick={toast.onClick}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
