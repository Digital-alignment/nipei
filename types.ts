
export interface AudioSlot {
  id: string;
  title: string;
  url?: string;
  author: string;
}

export interface Product {
  id: string;
  name: string;
  technicalName: string;
  classification: string;
  images: string[];
  benefits: string;
  history: string;
  composition: string;
  safetyRequirement?: string;
  labels: {
    key: string;
    value: string;
  }[];
  audioSlots: AudioSlot[];
  isVisible: boolean;
  stock_quantity: number;
  monthly_production_goal: number;
}

export type Theme = 'light' | 'dark';
