import { cn } from '@/lib/utils';
import { FeatureCardProps } from './FeatureCard.types';

export const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  className 
}: FeatureCardProps) => {
  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-3 w-full max-w-[280px] mx-auto',
        'md:max-w-[162.86px]',
        className
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-center text-base font-semibold font-sans text-gray-900 leading-tight">
        {title}
      </h3>

      {/* Description */}
      <p className="text-center text-sm font-sans text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
};
