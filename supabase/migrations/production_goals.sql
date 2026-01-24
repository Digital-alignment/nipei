-- Create production_goals table
CREATE TABLE IF NOT EXISTS public.production_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Lote Janeiro 2024"
    deadline DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    targets JSONB DEFAULT '{}'::jsonb, -- {"1 Litro": 50, "500ml": 100}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.production_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON public.production_goals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admins and managers" ON public.production_goals
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('superadmin', 'otter', 'mutum_manager')
    );

CREATE POLICY "Enable update for admins and managers" ON public.production_goals
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('superadmin', 'otter', 'mutum_manager')
    );

CREATE POLICY "Enable delete for admins" ON public.production_goals
    FOR DELETE USING (
        auth.jwt() ->> 'role' IN ('superadmin', 'otter')
    );
