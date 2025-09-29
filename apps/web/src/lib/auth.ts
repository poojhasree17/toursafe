import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
}

export async function signInWithEmail(email: string, password?: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // Don't create user automatically
    },
  });

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Get user role from app_users table
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!appUser) return null;

    return {
      id: user.id,
      email: user.email!,
      role: appUser.role as 'ADMIN' | 'OPERATOR',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export function hasPermission(user: User | null, requiredRole: 'ADMIN' | 'OPERATOR'): boolean {
  if (!user) return false;

  if (requiredRole === 'ADMIN') {
    return user.role === 'ADMIN';
  }

  return user.role === 'ADMIN' || user.role === 'OPERATOR';
}
