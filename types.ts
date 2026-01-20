
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
  allowed_squads?: string[];
}

export type UserRole = 'superadmin' | 'otter' | 'mutum_manager' | 'squad3' | 'squad4' | 'squad5' | 'squad6' | 'squad7' | 'squad8' | 'squad9' | 'public' | 'sales_viewer';

export type PaymentType = 'fixed' | 'production' | 'mixed';

export interface WorkerSettings {
  user_id: string;
  payment_type: PaymentType;
  fixed_salary: number;
  production_rate: number;
  active: boolean;
  full_name?: string; // Joined from profiles
  role?: UserRole;      // Joined from profiles
}

export type ExpenseCategory = 'raw_material' | 'logistics' | 'fixed' | 'marketing' | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  recurrence?: string;
  created_by?: string;
}

export interface MaterialInput {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  current_stock: number;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  material_id: string;
  quantity_required: number;
  material_input?: MaterialInput; // Joined
}

export interface HarvestSeason {
  id: string;
  product_id: string;
  start_month: number;
  end_month: number;
  moon_phase_preference?: string;
  description?: string;
  product_name?: string; // Joined
}

// ... existing interfaces ...

export interface Tool {
  id: string;
  name: string;
  description?: string;
  usage_description?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'lost' | 'needed';
  quantity: number;
  acquisition_date?: string; // "When we recebit"
  photos?: string[];
  purchase_date?: string;
  cost?: number;
  created_at?: string;
}

export interface ToolReport {
  id: string;
  tool_id: string;
  user_id: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  photos?: string[];
  status: 'pending' | 'resolved';
  created_at?: string;

  // Joins
  tools?: Tool;
  profiles?: { full_name: string };
}

export type Theme = 'light' | 'dark';
