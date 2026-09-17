/**
 * Nipëi OS Multi-Company & Agency System Types
 */

export type CompanyStatus = "active" | "archived";

export interface CompanyPerson {
  name: string;
  role: string;
  type: "client_contact" | "team_member";
}

export interface CompanySocialMedia {
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  x?: string;
}

export interface Company {
  id: string; // Slug (e.g. 'ini-rau', 'samakey')
  name: string;
  category: string; // Dynamic Category e.g. 'Fitoterapia', 'Retiros', 'Ecoturismo', 'SaaS'
  status: CompanyStatus;
  description: string;
  location?: string;
  websites?: string[];
  socialMedia?: CompanySocialMedia;
  goals: string[];
  peopleInvolved: CompanyPerson[];
  assignedSquads: string[];
  assignedAgents: string[];
  vaultPath: string; // Relative to nipei-vault e.g. 'Clientes/Ini Rau.md'
  accentColor: string;
  createdAt: string;
  updatedAt: string;
}
