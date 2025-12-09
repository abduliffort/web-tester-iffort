"use client";
import React, { useState, useEffect } from "react";
import { X, WifiOff, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastState {
  message: string;
  type: "success" | "error" | null;
  visible: boolean;
}

export const NetworkToast = () => {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: null,
    visible: false,
  });

  useEffect(() => {
    const showToast = (message: string, type: "success" | "error") => {
      setToast({ message, type, visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
    };

    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        setTimeout(() => showToast("You are back online!", "success"), 800);
      } else {
        setTimeout(
          () =>
            showToast(
              "It seems that you’re not connected to the internet!",
              "error"
            ),
          1200
        );
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Show offline toast immediately if already offline
    if (!navigator.onLine) {
      showToast("It seems that you’re not connected to the internet!", "error");
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <AnimatePresence>
      {toast.visible && toast.type && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-6 right-6 max-sm:right-0 max-sm:mx-2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-white w-auto
            ${
              toast.type === "success"
                ? "bg-green-600 border-green-400"
                : "bg-darkRed border-white"
            }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <Wifi size={24} className="text-white" />
            ) : (
              <WifiOff size={24} className="text-white" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
          >
            <X size={16} className="opacity-70 hover:opacity-100 transition" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
