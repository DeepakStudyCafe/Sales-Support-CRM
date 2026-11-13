import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  module: string;
  submodule?: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  module,
  submodule,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();

  if (hasPermission(module, submodule, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

