"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "es" | "en" | "pt";

export interface Translations {
  // Navigation & Header
  myPortal: string;
  login: string;
  fullInterface: string;
  changeUser: string;
  language: string;
  selectLanguage: string;
  spanish: string;
  english: string;
  portuguese: string;

  // Scope Bar
  allTabs: string;
  inicio: string;
  personal: string;
  empresa: string;
  createOrb: string;

  // Time Budget Widget
  capacityTitle: string;
  personalLimit: string;
  companyLimit: string;
  restBuffer: string;
  configured: string;
  assigned: string;
  available: string;
  overloaded: string;
  configureSchedule: string;

  // Date Navigator
  today: string;
  dailyTimeline: string;

  // Hero Card
  activeNow: string;
  elapsedTime: string;
  origin: string;
  methodologies: string;
  completeTask: string;
  pauseTask: string;

  // Orbs & Timeline
  protectedOrbs: string;
  customOrbs: string;
  completed: string;
  pending: string;
  inProgress: string;

  // Design System / UI Lab
  uiLabTitle: string;
  primitivesCatalog: string;
}

const dictionaries: Record<Language, Translations> = {
  es: {
    myPortal: "Mi Portal",
    login: "Login",
    fullInterface: "Interfaz Completa",
    changeUser: "Cambiar Usuario",
    language: "Idioma",
    selectLanguage: "Seleccionar Idioma",
    spanish: "Español 🇪🇸",
    english: "English 🇺🇸",
    portuguese: "Português 🇧🇷",

    allTabs: "Todos los Orbes",
    inicio: "Inicio (Hoy)",
    personal: "Personal 🌿",
    empresa: "Empresa ⚡",
    createOrb: "+ Crear Orbe",

    capacityTitle: "Control de Capacidad Rígida",
    personalLimit: "Ámbito Personal",
    companyLimit: "Ámbito Empresa",
    restBuffer: "Buffer de Descanso",
    configured: "Configurado",
    assigned: "Asignado",
    available: "Disponible",
    overloaded: "Sobrecargado",
    configureSchedule: "Ajustar Horarios",

    today: "HOY",
    dailyTimeline: "Navegador de Fechas",

    activeNow: "ACTIVIDAD ACTIVA AHORA",
    elapsedTime: "Tiempo Transcurrido",
    origin: "Origen",
    methodologies: "Metodologías",
    completeTask: "Concluir Tarea",
    pauseTask: "Pausar Tarea",

    protectedOrbs: "Orbes Obligatorios Protegidos",
    customOrbs: "Orbes Personalizados",
    completed: "CONCLUÍDO",
    pending: "PENDIENTE",
    inProgress: "EN PROGRESO",

    uiLabTitle: "Laboratorio de Componentes UI",
    primitivesCatalog: "Catálogo de Primitivos Nipëi OS",
  },
  en: {
    myPortal: "My Portal",
    login: "Login",
    fullInterface: "Full Interface",
    changeUser: "Switch User",
    language: "Language",
    selectLanguage: "Select Language",
    spanish: "Español 🇪🇸",
    english: "English 🇺🇸",
    portuguese: "Português 🇧🇷",

    allTabs: "All Orbs",
    inicio: "Today",
    personal: "Personal 🌿",
    empresa: "Company ⚡",
    createOrb: "+ Create Orb",

    capacityTitle: "Rigid Capacity Control",
    personalLimit: "Personal Scope",
    companyLimit: "Company Scope",
    restBuffer: "Rest Buffer",
    configured: "Configured",
    assigned: "Assigned",
    available: "Available",
    overloaded: "Overloaded",
    configureSchedule: "Adjust Schedule",

    today: "TODAY",
    dailyTimeline: "Date Navigator",

    activeNow: "ACTIVE NOW",
    elapsedTime: "Elapsed Time",
    origin: "Origin",
    methodologies: "Methodologies",
    completeTask: "Complete Task",
    pauseTask: "Pause Task",

    protectedOrbs: "Protected Mandatory Orbs",
    customOrbs: "Custom Orbs",
    completed: "COMPLETED",
    pending: "PENDING",
    inProgress: "IN PROGRESS",

    uiLabTitle: "UI Components Laboratory",
    primitivesCatalog: "Nipëi OS Primitives Catalog",
  },
  pt: {
    myPortal: "Meu Portal",
    login: "Login",
    fullInterface: "Interface Completa",
    changeUser: "Trocar Usuário",
    language: "Idioma",
    selectLanguage: "Selecionar Idioma",
    spanish: "Español 🇪🇸",
    english: "English 🇺🇸",
    portuguese: "Português 🇧🇷",

    allTabs: "Todos os Orbes",
    inicio: "Início (Hoje)",
    personal: "Pessoal 🌿",
    empresa: "Empresa ⚡",
    createOrb: "+ Criar Orbe",

    capacityTitle: "Controle de Capacidade Rígida",
    personalLimit: "Âmbito Pessoal",
    companyLimit: "Âmbito Empresa",
    restBuffer: "Buffer de Descanso",
    configured: "Configurado",
    assigned: "Atribuído",
    available: "Disponível",
    overloaded: "Sobrecarregado",
    configureSchedule: "Ajustar Horários",

    today: "HOJE",
    dailyTimeline: "Navegador de Datas",

    activeNow: "ATIVIDADE ATIVA AGORA",
    elapsedTime: "Tempo Decorrido",
    origin: "Origem",
    methodologies: "Metodologias",
    completeTask: "Concluir Tarefa",
    pauseTask: "Pausar Tarefa",

    protectedOrbs: "Orbes Obrigatórios Protegidos",
    customOrbs: "Orbes Personalizados",
    completed: "CONCLUÍDO",
    pending: "PENDENTE",
    inProgress: "EM PROGRESSO",

    uiLabTitle: "Laboratório de Componentes UI",
    primitivesCatalog: "Catálogo de Primitivos Nipëi OS",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "pt",
  setLanguage: () => {},
  t: dictionaries.pt,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt");

  useEffect(() => {
    const saved = localStorage.getItem("nipei_lang") as Language;
    if (saved && (saved === "es" || saved === "en" || saved === "pt")) {
      setLanguageState(saved);
    } else {
      setLanguageState("pt");
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("nipei_lang", lang);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: dictionaries[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
