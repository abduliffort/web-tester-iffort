import { cn } from '@/lib/utils';
import type { TestCardProps } from './TestCard.types';

export const TestCard = ({ 
  children, 
  className = '', 
  variant = 'quick',
  onClick 
}: TestCardProps) => {
  const variantColors = {
    quick: 'bg-[#FFF3EB] dark:bg-orange-900/20',
    full: 'bg-[#E8E7FF] dark:bg-purple-900/20',
    continuous: 'bg-[#E8F5E9] dark:bg-green-900/20',
  };

  return (
    <div 
      className={cn(
        'box-border flex flex-col items-center justify-center gap-4 rounded-[10px] border border-[#E3E3E3] dark:border-gray-700',
        'w-full min-h-[240px] sm:min-h-[260px] md:min-h-[280px] p-6 sm:p-7 md:p-8',
        variantColors[variant],
        onClick && 'cursor-pointer hover:shadow-lg dark:hover:shadow-gray-900/50 hover:scale-[1.02] transition-all duration-200',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
