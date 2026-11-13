import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'new':
      case 'open':
        return 'info';
      case 'contacted':
      case 'in progress':
      case 'active':
        return 'warning';
      case 'interested':
      case 'qualified':
      case 'converted':
      case 'resolved':
      case 'completed':
      case 'won':
      case 'closed won':
        return 'success';
      case 'lost':
      case 'closed lost':
      case 'failed':
      case 'cancelled':
      case 'overdue':
        return 'destructive';
      case 'waiting for customer':
      case 'follow-up':
      case 'paused':
        return 'purple';
      default:
        return 'secondary';
    }
  };

  return (
    <Badge variant={getVariant(status)} className={className}>
      {status || 'Unknown'}
    </Badge>
  );
}

