'use server'

import { createClient } from '@supabase/supabase-js'

type SignupResult = 
  | { success: true; message: string }
  | { success: false; error: string }

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Simple student signup - creates both auth user and public user profile
 * Uses environment variables for service role (privileged) access
 */
export async function studentSignupAction(
  email: string,
  password: string,
  fullName: string
): Promise<SignupResult> {
  try {
    // Normalize and validate inputs
    const normalizedEmail = email?.toLowerCase().trim()
    const normalizedPassword = password?.trim()
    const normalizedName = fullName?.trim()

    if (!normalizedEmail || !normalizedPassword || !normalizedName) {
      return { success: false, error: 'Email, password, and name are required' }
    }

    if (!isValidEmail(normalizedEmail)) {
      return { success: false, error: 'Please enter a valid email address' }
    }

    if (normalizedPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    if (normalizedName.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[studentSignup] Missing Supabase credentials')
      return { success: false, error: 'Server configuration error' }
    }

    // Create service role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Step 1: Create auth user
    console.log(`[studentSignup] Creating auth user for ${normalizedEmail}`)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      user_metadata: {
        full_name: normalizedName,
        role: 'student',
      },
      email_confirm: true,
    })

    if (authError) {
      console.error('[studentSignup] Auth creation failed:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError,
      })
      
      // Handle specific errors
      if (authError.message?.includes('already exists')) {
        return { success: false, error: 'This email is already registered' }
      }
      if (authError.message?.includes('password')) {
        return { success: false, error: 'Password does not meet requirements' }
      }
      
      return { success: false, error: `Account creation failed: ${authError.message}` }
    }

    if (!authData?.user?.id) {
      console.error('[studentSignup] No user ID returned from auth creation')
      return { success: false, error: 'Failed to create auth account' }
    }

    const userId = authData.user.id
    console.log(`[studentSignup] Auth user created: ${userId}`)

    // Step 2: Wait briefly for trigger to create public.users row
    // The trigger on auth.users will automatically create the user profile
    console.log(`[studentSignup] Waiting for trigger to create public user profile...`)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 3: Create user_profiles record
    console.log(`[studentSignup] Creating user profile metadata for ${userId}`)
    const { error: profileRecordError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        subscription_status: 'active',
      })

    if (profileRecordError) {
      console.warn('[studentSignup] Profile record creation failed:', profileRecordError)
      // This is non-critical, so we don't fail the signup
    }

    console.log(`[studentSignup] Successfully created user ${userId}`)
    return { 
      success: true, 
      message: 'Account created! You can now login.' 
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during signup'
    console.error('[studentSignup] Exception:', err)
    return { success: false, error: message }
  }
}

/**
 * Simple admin signup - creates both auth user and public admin profile
 */
export async function adminSignupAction(
  email: string,
  password: string,
  fullName: string
): Promise<SignupResult> {
  try {
    // Normalize and validate inputs
    const normalizedEmail = email?.toLowerCase().trim()
    const normalizedPassword = password?.trim()
    const normalizedName = fullName?.trim()

    if (!normalizedEmail || !normalizedPassword || !normalizedName) {
      return { success: false, error: 'Email, password, and name are required' }
    }

    if (!isValidEmail(normalizedEmail)) {
      return { success: false, error: 'Please enter a valid email address' }
    }

    if (normalizedPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }

    if (normalizedName.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[adminSignup] Missing Supabase credentials')
      return { success: false, error: 'Server configuration error' }
    }

    // Create service role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Step 1: Create auth user
    console.log(`[adminSignup] Creating auth user for ${normalizedEmail}`)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      user_metadata: {
        full_name: normalizedName,
        role: 'admin',
      },
      email_confirm: true,
    })

    if (authError) {
      console.error('[adminSignup] Auth creation failed:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError,
      })
      
      // Handle specific errors
      if (authError.message?.includes('already exists')) {
        return { success: false, error: 'This email is already registered' }
      }
      if (authError.message?.includes('password')) {
        return { success: false, error: 'Password does not meet requirements' }
      }
      
      return { success: false, error: `Account creation failed: ${authError.message}` }
    }

    if (!authData?.user?.id) {
      console.error('[adminSignup] No user ID returned from auth creation')
      return { success: false, error: 'Failed to create auth account' }
    }

    const userId = authData.user.id
    console.log(`[adminSignup] Auth user created: ${userId}`)

    // Step 2: Wait briefly for trigger to create public.users row
    // The trigger on auth.users will automatically create the user profile
    console.log(`[adminSignup] Waiting for trigger to create public user profile...`)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 3: Create user_profiles record
    console.log(`[adminSignup] Creating user profile metadata for ${userId}`)
    const { error: profileRecordError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        subscription_status: 'active',
      })

    if (profileRecordError) {
      console.warn('[adminSignup] Profile record creation failed:', profileRecordError)
      // This is non-critical
    }

    console.log(`[adminSignup] Successfully created admin user ${userId}`)
    return { 
      success: true, 
      message: 'Admin account created! You can now login.' 
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during signup'
    console.error('[adminSignup] Exception:', err)
    return { success: false, error: message }
  }
}
