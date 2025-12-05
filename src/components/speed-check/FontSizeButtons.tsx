'use client';
import { useState } from "react";

export default function FontSizeButtons() {
  const [selected, setSelected] = useState<"small" | "medium" | "large">("medium");

  return (
    <div className="flex items-center gap-3 text-indigo-600">

      {/* Large */}
      <button
        onClick={() => setSelected("large")}
        className={`cursor-pointer rounded px-2 py-1 font-sans ${
          selected === "large" ? "bg-indigo-600 text-white" : "hover:bg-indigo-100"
        } text-base`}
        aria-label="Large font size"
      >
        A
      </button>

      {/* Medium */}
      <button
        onClick={() => setSelected("medium")}
        className={`cursor-pointer rounded px-2 py-1 font-sans ${
          selected === "medium" ? "bg-indigo-600 text-white" : "hover:bg-indigo-100"
        } text-sm`}
        aria-label="Medium font size"
      >
        A
      </button>
      
      {/* Small */}
      <button
        onClick={() => setSelected("small")}
        className={`cursor-pointer rounded px-2 py-1 font-sans ${
          selected === "small" ? "bg-indigo-600 text-white" : "hover:bg-indigo-100"
        } text-xs`}
        aria-label="Small font size"
      >
        A
      </button>
    </div>
  );
}
