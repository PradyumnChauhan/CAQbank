import { createClient } from '@supabase/supabase-js'
import { normalizeQuestionPayload } from './question-import'

/**
 * Create a Supabase client with service role key (server-side only)
 * This bypasses RLS policies for admin operations
 */
export function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

/**
 * Validate that a user has admin role in the database
 */
export async function validateAdminRole(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('[validateAdminRole] Error:', error)
    return false
  }

  const isAdmin = data.role === 'admin' || data.role === 'superadmin'
  return isAdmin
}

/**
 * Parse and validate JSON question payload
 */
export async function normalizeAndValidateJSON(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString)
    const normalized = normalizeQuestionPayload(parsed)
    return normalized
  } catch (err) {
    throw new Error(
      `Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
    )
  }
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[getUserRole] Error:', error)
    return null
  }

  return data?.role || null
}
