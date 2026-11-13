"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, X, CheckCheck } from 'lucide-react';

export interface BulkActionItem {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
}

export interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAllFiltered?: () => void;
  isAllFilteredSelected?: boolean;
  actions?: BulkActionItem[];
  children?: React.ReactNode;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAllFiltered,
  isAllFilteredSelected = false,
  actions = [],
  children,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/60 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <CheckSquare className="h-5 w-5 text-indigo-400" />
        <span className="text-sm font-semibold whitespace-nowrap">
          <span className="text-indigo-300 font-bold">{selectedCount}</span> selected
        </span>
      </div>

      {totalCount && totalCount > selectedCount && onSelectAllFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAllFiltered}
          className="text-xs text-indigo-300 hover:text-white hover:bg-slate-800 h-8 gap-1.5 px-2"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          {isAllFilteredSelected ? `Deselect all` : `Select all ${totalCount}`}
        </Button>
      )}

      <div className="flex items-center gap-2">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            variant={action.variant || 'secondary'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        {children}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full ml-1"
        title="Clear Selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
