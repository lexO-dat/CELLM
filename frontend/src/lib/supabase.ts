import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Missing'
  })
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Validate that we're using the anon key, not the service role key
if (supabaseKey && supabaseKey.includes('service_role')) {
  console.error('⚠️  WARNING: You are using the service role key instead of the anon key!')
  console.error('Please use the anon key for client-side authentication.')
}

console.log('Supabase client configured:', {
  url: supabaseUrl,
  keyType: supabaseKey?.includes('service_role') ? 'service_role (WRONG!)' : 'anon (correct)'
})

export const supabase = createClient(supabaseUrl, supabaseKey)
