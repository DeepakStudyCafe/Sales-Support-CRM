import { useAuth } from '@/contexts/AuthContext';

export function usePermission(module: string, submodule?: string, action?: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(module, submodule, action);
}

