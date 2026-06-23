import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Guard: createClient throws synchronously when the URL is empty, which
// causes a white page before any React component can mount. Instead we
// create a placeholder client against a non-empty URL so the JS module
// loads cleanly; every Supabase call will fail gracefully with a network
// error rather than crashing the bundle.
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** True only when real credentials are injected via environment variables. */
export const supabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);
