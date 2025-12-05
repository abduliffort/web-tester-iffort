import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { TestCardContentProps } from './TestCard.types';

export const TestCardContent = ({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
  badge,
}: TestCardContentProps) => {
  return (
    <div className="flex flex-col gap-4 w-full items-center text-center">
      {badge && (
        <Badge variant="recommended" className="text-xs sm:text-sm mb-1">
          {badge}
        </Badge>
      )}
      <div className="flex flex-col items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14">{icon}</div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold font-sans text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-sans leading-relaxed px-2">{description}</p>
      <Button 
        onClick={onButtonClick}
        className="mt-2 w-full max-w-[280px] text-sm font-semibold"
        variant="outline"
      >
        {buttonText}
      </Button>
    </div>
  );
};
