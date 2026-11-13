import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface ChartCardProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  actionSlot?: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  isLoading = false,
  children,
  actionSlot,
}: ChartCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>
        {actionSlot}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

