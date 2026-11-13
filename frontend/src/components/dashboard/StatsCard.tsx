import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  iconColor = 'text-primary',
  trend = 'neutral',
  isLoading = false,
  onClick,
}: StatsCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md",
        onClick && "cursor-pointer active:scale-[0.99]"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn("p-2.5 rounded-xl bg-primary/10", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3">
          {isLoading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
          )}
        </div>

        {change !== undefined && (
          <div className="mt-2.5 flex items-center text-xs gap-1.5">
            {trend === 'up' && (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" />
                +{change}%
              </span>
            )}
            {trend === 'down' && (
              <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" />
                -{change}%
              </span>
            )}
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

