
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify the caller is an authenticated Admin
    const authHeader = req.headers.get('Authorization')!
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Invalid User Token')

    // 2. Perform the Action using Service Role (Privileged)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user is admin - checking both metadata AND profiles table (using Admin client to bypass RLS)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Allow if role is 'admin' (or check your specific role logic)
    const isAdmin = user.user_metadata?.role === 'admin' || profile?.role === 'admin'
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const { email, password, role, full_name, user_id } = await req.json()

    // UPDATE USER
    if (req.method === 'PUT' || (user_id && !password)) {
        if (!user_id) throw new Error("User ID required for update")
        
        const updates: any = {}
        if (email) updates.email = email
        if (password) updates.password = password
        if (Object.keys(updates).length > 0) {
             const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                user_id,
                updates
            )
            if (updateError) throw updateError
        }

        // Update Profile
        if (full_name || role) {
            const profileUpdates: any = {}
            if (full_name) profileUpdates.full_name = full_name
            if (role) profileUpdates.role = role

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user_id)
            
            if (profileError) throw profileError
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }

    // CREATE USER
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    })

    if (createError) throw createError

    // Ensure profile is set
    if (newUser.user) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                full_name,
                role
            })
        if (profileError) console.error("Profile Error", profileError)
    }

    return new Response(
      JSON.stringify(newUser),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    )
  }
})
