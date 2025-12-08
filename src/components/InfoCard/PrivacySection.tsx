import { cn } from "@/lib/utils";
import {
  WhatWeMeasureCard,
  WhatWeDontCollectCard,
  WhyWeMeasureCard,
} from "./InfoCardVariants";

interface PrivacySectionProps {
  className?: string;
}

export const PrivacySection = ({ className }: PrivacySectionProps) => {
  return (
    <div className={cn("w-full py-16 bg-gray-50", className)}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold font-sans text-gray-900 mb-2">
            TRAI MySpeed Values Your Privacy
          </h2>
        </div>

        {/* Info Cards Grid */}
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-6">
          <WhatWeMeasureCard />
          <WhatWeDontCollectCard />
          <WhyWeMeasureCard />
        </div>
      </div>
    </div>
  );
};
