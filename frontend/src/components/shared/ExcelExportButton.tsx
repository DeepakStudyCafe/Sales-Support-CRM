"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/services/api';
import { toast } from 'sonner';

export interface ExcelExportButtonProps {
  module: string;
  selectedIds?: string[];
  filterParams?: Record<string, any>;
  localData?: any[];
  filename?: string;
  variant?: 'outline' | 'default' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  module,
  selectedIds = [],
  filterParams = {},
  localData,
  filename,
  variant = 'outline',
  size = 'sm',
  className = 'h-9 gap-1.5 text-xs',
  label = 'Export Excel',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportFilename = filename || `${module}_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // If local data is provided directly, export using SheetJS client-side
      if (localData && localData.length > 0 && selectedIds.length === 0) {
        const ws = XLSX.utils.json_to_sheet(localData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, module);
        XLSX.writeFile(wb, exportFilename);
        toast.success(`Exported ${localData.length} records successfully!`);
        return;
      }

      // Otherwise, request from backend endpoint which generates formatted multi-column export
      const response = await api.post(
        `/bulk/export/${module}`,
        {
          ids: selectedIds.length > 0 ? selectedIds : undefined,
          ...filterParams,
        },
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const countMsg = selectedIds.length > 0 ? `${selectedIds.length} selected records` : 'all matching records';
      toast.success(`Exported ${countMsg} to Excel.`);
    } catch (err: any) {
      console.error('Export failed', err);
      toast.error('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      )}
      {label}
      {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
    </Button>
  );
};
