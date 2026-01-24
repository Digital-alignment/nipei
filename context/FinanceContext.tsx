import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { WorkerSettings, Expense, MaterialInput, ProductRecipe, HarvestSeason, Tool, ToolReport } from '../types';
import { useAuth } from './AuthContext';

interface FinanceContextType {
    workers: WorkerSettings[];
    expenses: Expense[];
    materials: MaterialInput[];
    recipes: ProductRecipe[];
    seasons: HarvestSeason[];
    tools: Tool[];
    toolReports: ToolReport[];
    loading: boolean;

    // Actions
    fetchWorkers: () => Promise<void>;
    updateWorkerSettings: (userId: string, settings: Partial<WorkerSettings>) => Promise<void>;
    createWorkerUser: (email: string, password: string, role: string, fullName: string) => Promise<any>;
    updateWorkerUser: (userId: string, updates: { email?: string, password?: string, full_name?: string, role?: string }) => Promise<any>;

    fetchExpenses: () => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;

    fetchMaterials: () => Promise<void>;
    addMaterial: (material: Omit<MaterialInput, 'id'>) => Promise<void>;
    updateMaterial: (id: string, updates: Partial<MaterialInput>) => Promise<void>;

    fetchSeasons: () => Promise<void>;
    addSeason: (season: Omit<HarvestSeason, 'id'>) => Promise<void>;

    fetchTools: () => Promise<void>;
    addTool: (tool: Omit<Tool, 'id'>) => Promise<void>;
    updateTool: (id: string, updates: Partial<Tool>) => Promise<void>;
    fetchToolReports: () => Promise<void>;
    addToolReport: (report: Omit<ToolReport, 'id'>) => Promise<void>;

    // Calculations
    getTotalExpenses: (month?: number, year?: number) => number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const [workers, setWorkers] = useState<WorkerSettings[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [materials, setMaterials] = useState<MaterialInput[]>([]);
    const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
    const [seasons, setSeasons] = useState<HarvestSeason[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [toolReports, setToolReports] = useState<ToolReport[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session) {
            loadAllData();
        }
    }, [session]);

    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchWorkers(),
            fetchExpenses(),
            fetchMaterials(),
            fetchSeasons(),
            fetchTools(),
            fetchToolReports()
        ]);
        setLoading(false);
    };

    const fetchWorkers = async () => {
        const { data: settings, error } = await supabase
            .from('worker_settings')
            .select(`
        *,
        profiles:user_id (full_name, role)
      `);

        if (error) console.error('Error fetching workers:', error);
        else {
            // Map join result to flat structure
            const formatted = settings.map((s: any) => ({
                ...s,
                full_name: s.profiles?.full_name,
                role: s.profiles?.role
            }));
            setWorkers(formatted);
        }
    };

    const updateWorkerSettings = async (userId: string, settings: Partial<WorkerSettings>) => {
        const { error } = await supabase
            .from('worker_settings')
            .upsert({ user_id: userId, ...settings });
        if (error) throw error;
        await fetchWorkers();
    };

    const createWorkerUser = async (email: string, password: string, role: string, fullName: string) => {
        // Call Edge Function
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: { email, password, role, full_name: fullName }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Refresh workers
        await fetchWorkers();
        return data;
    };

    const updateWorkerUser = async (userId: string, updates: { email?: string, password?: string, full_name?: string, role?: string }) => {
        const { data, error } = await supabase.functions.invoke('create-user', {
            method: 'PUT',
            body: { user_id: userId, ...updates }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        await fetchWorkers();
        return data;
    };

    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });
        if (error) console.error('Error fetching expenses:', error);
        else setExpenses(data || []);
    };

    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        const { error } = await supabase.from('expenses').insert([expense]);
        if (error) throw error;
        await fetchExpenses();
    };

    const deleteExpense = async (id: string) => {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        await fetchExpenses();
    };

    const fetchMaterials = async () => {
        const { data, error } = await supabase.from('material_inputs').select('*');
        if (error) console.error('Error fetching materials:', error);
        else setMaterials(data || []);
    };

    const addMaterial = async (material: Omit<MaterialInput, 'id'>) => {
        const { error } = await supabase.from('material_inputs').insert([material]);
        if (error) throw error;
        await fetchMaterials();
    };

    const updateMaterial = async (id: string, updates: Partial<MaterialInput>) => {
        const { error } = await supabase.from('material_inputs').update(updates).eq('id', id);
        if (error) throw error;
        await fetchMaterials();
    };

    const fetchSeasons = async () => {
        const { data, error } = await supabase.from('harvest_seasons').select(`*, products(name)`);
        if (error) console.error('Error fetching seasons:', error);
        else {
            const formatted = data.map((d: any) => ({
                ...d,
                product_name: d.products?.name
            }));
            setSeasons(formatted);
        }
    };

    const addSeason = async (season: Omit<HarvestSeason, 'id'>) => {
        const { error } = await supabase.from('harvest_seasons').insert([season]);
        if (error) throw error;
        await fetchSeasons();
        await fetchSeasons();
    };

    const fetchTools = async () => {
        const { data, error } = await supabase.from('tools').select('*').order('name');
        if (error) console.error('Error fetching tools:', error);
        else setTools(data || []);
    };

    const addTool = async (tool: Omit<Tool, 'id'>) => {
        const { error } = await supabase.from('tools').insert([tool]);
        if (error) throw error;
        await fetchTools();
    };

    const updateTool = async (id: string, updates: Partial<Tool>) => {
        const { error } = await supabase.from('tools').update(updates).eq('id', id);
        if (error) throw error;
        await fetchTools();
    };

    const fetchToolReports = async () => {
        const { data, error } = await supabase
            .from('tool_reports')
            .select(`*, tools(name), profiles:user_id(full_name)`)
            .order('created_at', { ascending: false });
        if (error) console.error('Error fetching reports:', error);
        else setToolReports(data || []);
    };

    const addToolReport = async (report: Omit<ToolReport, 'id'>) => {
        const { error } = await supabase.from('tool_reports').insert([report]);
        if (error) throw error;
        await fetchToolReports();
    };

    const getTotalExpenses = (month?: number, year?: number) => {
        // 1. Sum recorded expenses
        const expenseTotal = expenses.reduce((acc, curr) => {
             // TODO: Filter by date if month/year provided
             // For now, simple sum of all (as per previous logic, but should ideally filter)
            return acc + Number(curr.amount);
        }, 0);

        // 2. Sum fixed payroll (Projected monthly cost)
        // Only active workers with fixed or mixed payment type
        const payrollTotal = workers.reduce((acc, curr) => {
            if (!curr.active) return acc;
            if (curr.payment_type === 'fixed' || curr.payment_type === 'mixed') {
                return acc + Number(curr.fixed_salary || 0);
            }
            return acc;
        }, 0);

        return expenseTotal + payrollTotal;
    };

    return (
        <FinanceContext.Provider value={{
            workers, expenses, materials, recipes, seasons, loading,
            fetchWorkers, updateWorkerSettings, createWorkerUser, updateWorkerUser,
            fetchExpenses, addExpense, deleteExpense,
            fetchMaterials, addMaterial, updateMaterial,
            fetchSeasons, addSeason,
            tools, toolReports, fetchTools, addTool, updateTool, fetchToolReports, addToolReport,
            getTotalExpenses
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};
