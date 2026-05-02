import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, X } from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

export function AICopilotBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (location.pathname === "/ai") return null;

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-modal overflow-hidden border border-brand-border/30">
          <AICopilotPanel onClose={() => setIsOpen(false)} />
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-modal flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-brand-dark text-white rotate-0"
            : "bg-brand-accent text-white hover:bg-brand-accent/90 hover:scale-105"
        }`}
        aria-label={isOpen ? "Close Fundy AI" : "Open Fundy AI"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Bot className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
