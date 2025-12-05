import { cn } from '@/lib/utils';
import type { InfoCardProps } from './InfoCard.types';

export const InfoCard = ({ title, items, className }: InfoCardProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-5 p-6 bg-white border border-[#E3E3E3] rounded-[10px]',
        'shadow-[0px_4px_20px_rgba(0,0,0,0.05)]',
        'w-full max-w-[370px] min-h-[177px]',
        'md:p-4 md:gap-3 md:max-w-[340px] md:min-h-[151px]',
        className
      )}
    >
      {/* Title */}
      <h3 className="text-lg font-semibold font-sans text-gray-900">
        {title}
      </h3>

      {/* List Items */}
      <ul className="flex flex-col gap-3 w-full">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-gray-600 mt-1">•</span>
            <span className="text-sm font-sans text-gray-600 leading-relaxed flex-1">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
