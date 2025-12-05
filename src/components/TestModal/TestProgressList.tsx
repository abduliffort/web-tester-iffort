import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Clock,
  Download,
  Upload,
  Globe,
  Video,
  ArrowLeftRight,
} from "lucide-react";

interface TestItem {
  label: string;
  value: string;
  unit: string;
  status: "completed" | "in-progress" | "pending";
  progress?: number;
  icon?: string;
  color?: string;
}

interface TestProgressListProps {
  tests: TestItem[];
  currentStep: string;
}

export const TestProgressList: React.FC<TestProgressListProps> = ({
  tests,
  currentStep,
}) => {
  const t = useTranslation();
  const isInitializing = currentStep === "initializing";

  const getLucideIcon = (label: string) => {
    const iconSize = "clamp(16px, 3vw, 24px)"; // 16px on small, up to 24px max

    if (label.includes("Latency")) return <ArrowLeftRight size={iconSize} />;
    if (label.includes("Download")) return <Download size={iconSize} />;
    if (label.includes("Upload")) return <Upload size={iconSize} />;
    if (label.includes("Web")) return <Globe size={iconSize} />;
    if (label.includes("Video") || label.includes("Streaming"))
      return <Video size={iconSize} />;
    return <Clock size={iconSize} />;
  };

  return (
    <div
      className={`w-full grid ${
        tests?.length === 2 ? "grid-cols-2" : "grid-cols-3"
      } gap-3 sm:gap-4`}
    >
      {tests.map((test, index) => {
        const circleBgClass =
          test.color === "yellow" ? "darkYellow" : test.color ?? "bg-gray-700";
        test.color =
          test.status === "in-progress"
            ? "bg-gradient-to-b from-[#F3B643] from-20% to-[#F9DA95] to-80%"
            : test.status === "completed"
            ? "bg-gradient-to-b from-[#F3B643] from-20% to-[#F9DA95] to-80%"
            : "border border-gray-300 dark:border-gray-600 bg-white/20";

        const statusRing =
          test.status === "in-progress"
            ? "animate-pulse"
            : test.status === "completed"
            ? "ring-0"
            : "ring-0";

        const boxBorderClass =
          test.status === "completed"
            ? "border-none"
            : test.status === "in-progress"
            ? "border-blue-300 dark:border-darkYellow shadow-sm"
            : "border-gray-200 dark:border-none";

        return (
          <div
            key={index}
            className={`relative rounded-lg border ${boxBorderClass} 
              bg-white/5 dark:bg-white/10 
              p-3 sm:p-6 
              flex flex-col items-center justify-center text-center 
              transition-all duration-300`}
          >
            {/* Circle */}
            <div
              className={`relative w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center ${circleBgClass} ${statusRing}`}
            >
              <span className="text-sm sm:text-lg font-semibold tracking-tight select-none dark:text-black">
                {test.value ?? "-"}
              </span>
            </div>

            {/* Label */}
            <div className="mt-2 sm:mt-3">
              <div className="text-[0.8rem] sm:text-[1.12rem] flex items-center gap-1 sm:gap-2 font-medium justify-center truncate">
                {getLucideIcon(test.label)}
                {test.label}
              </div>
              <div className="text-gray-400 dark:text-white/40 mt-1 text-[0.7rem] sm:text-sm">
                ({test.unit})
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
