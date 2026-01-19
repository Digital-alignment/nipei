
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        const { email, password, role, full_name, user_id } = await req.json()

        // IF Method is PUT, we update the user
        if (req.method === 'PUT' || (user_id && !password)) {
            if (!user_id) throw new Error("User ID required for update")

            const updates: any = {}
            if (email) updates.email = email
            if (password) updates.password = password

            // Update Auth User
            const { data: user, error: updateError } = await supabaseClient.auth.admin.updateUserById(
                user_id,
                updates
            )

            if (updateError) throw updateError

            // Update Profile
            if (full_name || role) {
                const profileUpdates: any = {}
                if (full_name) profileUpdates.full_name = full_name
                if (role) profileUpdates.role = role

                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('id', user_id)

                if (profileError) throw profileError
            }

            return new Response(
                JSON.stringify(user),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            )
        }

        // CREATE NEW USER
        const { data: user, error: createError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role }
        })

        if (createError) throw createError

        // Manually ensure profile exists/updates (Triggers usually handle this, but for safety)
        if (user.user) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .upsert({
                    id: user.user.id,
                    full_name,
                    role
                })

            if (profileError) {
                // If profile update fails, we might want to log it or warn, 
                // but user creation itself succeeded. 
                console.error("Profile creation failed", profileError)
            }
        }

        return new Response(
            JSON.stringify(user),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})
