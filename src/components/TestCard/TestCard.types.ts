import { ReactNode } from 'react';

export interface TestCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'quick' | 'full' | 'continuous';
  onClick?: () => void;
}

export interface TestCardContentProps {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onButtonClick?: () => void;
  badge?: string;
}
