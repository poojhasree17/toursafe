import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
}

export async function signInWithEmail(email: string, password?: string) {
  // Simple demo authentication - no longer needed since we handle it in the component
  // This function is kept for compatibility but the actual auth happens in the login component
  return { data: null, error: null };
}

export async function signOut() {
  try {
    // Clear localStorage session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('toursafe_user');
    }

    // Also sign out from Supabase Auth for compatibility
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Error during sign out:', error);
    return { error };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Check localStorage for demo user session
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('toursafe_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          id: user.id,
          email: user.email,
          role: user.role as 'ADMIN' | 'OPERATOR',
        };
      }
    }

    // Fallback to Supabase Auth for compatibility
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        // Get user role from app_users table
        const { data: appUser } = await supabase
          .from('app_users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (appUser) {
          return {
            id: user.id,
            email: user.email!,
            role: appUser.role as 'ADMIN' | 'OPERATOR',
          };
        }
      } catch (dbError) {
        // Database not available, use mock data
        console.log('Database not available for user lookup, using mock data');
      }

      // Fallback to mock data
      const { mockData } = await import('./supabase');
      const mockUser = mockData.app_users.find(u => u.id === user.id);

      if (mockUser) {
        return {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role as 'ADMIN' | 'OPERATOR',
        };
      }
    }

    return null;
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

