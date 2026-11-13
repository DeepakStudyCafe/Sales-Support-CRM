import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getVariant = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'info';
      case 'high':
        return 'warning';
      case 'urgent':
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(priority)} className={className}>
      {priority || 'Normal'}
    </Badge>
  );
}

