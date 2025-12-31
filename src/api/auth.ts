// src/api/auth.ts
import { supabase } from './supabase';

export const signUpUser = async (
  email: string,
  password: string,
  phoneNumber: string,  
  fullName: string,
  role: 'trainer' | 'member'
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
        email: email,
        uuid: crypto.randomUUID(),
        role: role, // 'trainer' 또는 'member'
      },
    },
  });

  if (error) throw error;
  return data;
};