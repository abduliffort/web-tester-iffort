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
  value: string | number;
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
    const iconSize = "clamp(16px, 3vw, 20px)";
    if (label.includes("Latency"))
      return <ArrowLeftRight size={iconSize} className="text-white/70" />;
    if (label.includes("Download"))
      return <Download size={iconSize} className="text-white/70" />;
    if (label.includes("Upload"))
      return <Upload size={iconSize} className="text-white/70" />;
    if (label.includes("Web"))
      return <Globe size={iconSize} className="text-white/70" />;
    if (label.includes("Video") || label.includes("Streaming"))
      return <Video size={iconSize} className="text-white/70" />;
    return <Clock size={iconSize} className="text-white/70" />;
  };

  const formatValue = (label: string, value: any, unit: string) => {
    if (value === undefined || value === null || isNaN(Number(value)))
      return { displayValue: "-", displayUnit: unit };

    // Convert ms to s only for Web or Video
    if (label.includes("Web") || label.includes("Video")) {
      const seconds = Number(value) / 1000;
      return {
        displayValue: seconds.toFixed(2), // ✅ two decimal places
        displayUnit: "Seconds",
      };
    }

    return { displayValue: value, displayUnit: unit };
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
            ? "animate-pulse " + test.color
            : test.status === "completed"
            ? "ring-0 " + test.color
            : "ring-0 " + test.color;

        const boxBorderClass =
          test.status === "completed"
            ? "border-none"
            : test.status === "in-progress"
            ? "border-blue-300 dark:border-darkYellow shadow-sm"
            : "border-gray-200 dark:border-none";

        const { displayValue, displayUnit } = formatValue(
          test.label,
          test.value,
          test.unit
        );

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
              className={`relative w-20 h-20 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center ${circleBgClass} ${statusRing}`}
            >
              <span className="text-size1 tracking-tight select-none dark:text-darkBlack">
                {displayValue}
              </span>
              <span className="text-size4 text-darkBlack">{displayUnit}</span>
            </div>

            {/* Label */}
            <div className="mt-2 sm:mt-3">
              <div className="text-size2 flex items-center gap-1 sm:gap-2 justify-center truncate">
                {getLucideIcon(test.label)}
                {test.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
