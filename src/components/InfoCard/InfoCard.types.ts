import { ReactNode } from 'react';

export interface InfoCardProps {
  title: string;
  items: string[];
  className?: string;
}

export interface InfoCardListItem {
  text: string;
}
