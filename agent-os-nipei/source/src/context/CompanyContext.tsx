"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Company } from "@/types/company";
import { INITIAL_COMPANIES } from "@/data/companies";

interface CompanyContextType {
  companies: Company[];
  activeCompanyId: string; // 'all' or company.id (slug)
  activeCompany: Company | null;
  setActiveCompanyId: (id: string) => void;
  addCompany: (data: Partial<Company>) => Promise<Company>;
  archiveCompany: (id: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const LS_ACTIVE_COMPANY = "nipei.active_company_id";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load companies and active selection from API / localStorage
  const refreshCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        if (data.companies && Array.isArray(data.companies) && data.companies.length > 0) {
          setCompanies(data.companies);
        }
      }
    } catch (err) {
      console.error("Failed to load companies from API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCompanies();
    try {
      const savedId = localStorage.getItem(LS_ACTIVE_COMPANY);
      if (savedId) {
        setActiveCompanyIdState(savedId);
      }
    } catch {}
  }, []);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    try {
      localStorage.setItem(LS_ACTIVE_COMPANY, id);
    } catch {}
  };

  const addCompany = async (data: Partial<Company>): Promise<Company> => {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to create company");
    }
    await refreshCompanies();
    return result.company;
  };

  const archiveCompany = async (id: string) => {
    const res = await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "archived" }),
    });
    if (!res.ok) {
      throw new Error("Failed to archive company");
    }
    await refreshCompanies();
    if (activeCompanyId === id) {
      setActiveCompanyId("all");
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompanyId,
        activeCompany,
        setActiveCompanyId,
        addCompany,
        archiveCompany,
        refreshCompanies,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
