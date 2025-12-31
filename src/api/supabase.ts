import { createClient } from '@supabase/supabase-js';
// import { Database } from '../types/supabase'; // 자동 생성된 타입 적용 시

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);