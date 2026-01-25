-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for admins and managers" ON public.production_goals;
DROP POLICY IF EXISTS "Enable update for admins and managers" ON public.production_goals;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.production_goals;

-- Re-create policies using the correct user_metadata path
CREATE POLICY "Enable insert for admins and managers" ON public.production_goals
    FOR INSERT WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'otter', 'mutum_manager')
    );

CREATE POLICY "Enable update for admins and managers" ON public.production_goals
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'otter', 'mutum_manager')
    );

CREATE POLICY "Enable delete for admins" ON public.production_goals
    FOR DELETE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'otter')
    );
