import { lazy, Suspense } from "react";
import { useStore } from "@tanstack/react-store";

import { showAIAssistant } from "../store/example-assistant";

const AIAssistantDialog = lazy(() => import("./agent"));

export default function AIAssistant() {
  const isOpen = useStore(showAIAssistant);

  return (
    <div className="relative z-50">
      <button
        onClick={() => showAIAssistant.setState((state) => !state)}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90 transition-opacity"
      >
        <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-xs font-medium">
          AI
        </div>
        AI Assistant
      </button>

      {isOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <AIAssistantDialog />
        </Suspense>
      )}
    </div>
  );
}
