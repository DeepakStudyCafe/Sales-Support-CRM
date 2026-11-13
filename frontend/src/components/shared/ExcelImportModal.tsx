"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/services/api';
import { toast } from 'sonner';

export interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: 'leads' | 'customers' | 'tickets';
  title?: string;
  onSuccess?: () => void;
}

interface ParsedRow {
  _rowNumber: number;
  _isValid: boolean;
  _errors: string[];
  [key: string]: any;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  module,
  title,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; field: string; message: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setColumns([]);
    setFilterView('all');
    setIsUploading(false);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/bulk/template/${module}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${module}_import_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${module} import template.`);
    } catch (err: any) {
      toast.error('Failed to download template: ' + (err.response?.data?.message || err.message));
    }
  };

  // Parse File in Browser
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload a valid .xlsx or .xls Excel spreadsheet');
      return;
    }

    setFile(selectedFile);
    parseExcel(selectedFile);
  };

  const validateRow = (row: any, mod: string): string[] => {
    const errs: string[] = [];
    if (mod === 'leads') {
      const fn = row['First Name'] || row.firstName || row.first_name;
      const phone = row['Phone'] || row.phone;
      const email = row['Email'] || row.email;
      if (!fn) errs.push('First Name is required');
      if (!phone || String(phone).replace(/\D/g, '').length < 8) {
        errs.push('Valid Phone number required (min 8 digits)');
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        errs.push('Invalid email format');
      }
    } else if (mod === 'customers') {
      const email = row['Email'] || row.email;
      const phone = row['Phone'] || row.phone;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        errs.push('Valid Email is required');
      }
      if (!phone) errs.push('Phone is required');
    } else if (mod === 'tickets') {
      const t = row['Title'] || row.title;
      if (!t) errs.push('Title is required');
    }
    return errs;
  };

  const parseExcel = async (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheet]);

        if (rawRows.length === 0) {
          toast.error('The selected file contains no records.');
          return;
        }

        const cols = Object.keys(rawRows[0] || {}).filter(k => !k.startsWith('_'));
        setColumns(cols);

        const processed: ParsedRow[] = rawRows.map((r, index) => {
          const errs = validateRow(r, module);
          return {
            ...r,
            _rowNumber: index + 2,
            _isValid: errs.length === 0,
            _errors: errs,
          };
        });

        setParsedRows(processed);
        setStep(2);
        toast.success(`Loaded ${processed.length} records. Review validation below.`);
      } catch (err: any) {
        toast.error('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };

  // Submit to Backend
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows found to import.');
      return;
    }

    setIsUploading(true);
    try {
      // Send valid rows directly as JSON payload for high reliability
      const response = await api.post(`/bulk/import/${module}`, {
        records: validRows,
      });

      const resData = response.data?.data || {
        total: validRows.length,
        imported: validRows.length,
        failed: 0,
        errors: [],
      };

      setImportResult(resData);
      setStep(3);
      toast.success(response.data?.message || `Successfully imported records.`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  // Export Errors Report
  const handleDownloadErrorReport = () => {
    if (!importResult?.errors?.length && !parsedRows.some(r => !r._isValid)) {
      toast.info('No errors to export.');
      return;
    }

    const invalidRows = parsedRows.filter(r => !r._isValid).map(r => ({
      Row: r._rowNumber,
      Errors: r._errors.join(', '),
      ...r,
    }));

    const ws = XLSX.utils.json_to_sheet(invalidRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
    XLSX.writeFile(wb, `${module}_import_errors_${Date.now()}.xlsx`);
    toast.success('Downloaded error report.');
  };

  const validCount = parsedRows.filter(r => r._isValid).length;
  const invalidCount = parsedRows.filter(r => !r._isValid).length;

  const displayRows = parsedRows.filter(r => {
    if (filterView === 'valid') return r._isValid;
    if (filterView === 'invalid') return !r._isValid;
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {title || `Bulk Import ${module.charAt(0).toUpperCase() + module.slice(1)} via Excel`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload .xlsx spreadsheet with validation, preview, and automatic error handling
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between pt-4 px-8">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted'}`}>1</span>
              Upload & Template
            </div>
            <div className={`h-0.5 flex-1 mx-4 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted'}`}>2</span>
              Preview & Validate
            </div>
            <div className={`h-0.5 flex-1 mx-4 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted'}`}>3</span>
              Results
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: Upload and Template */}
        {step === 1 && (
          <div className="py-6 space-y-6 overflow-y-auto">
            {/* Step 1A: Download Template Banner */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                  Need the standardized Excel template?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Includes sample row data, required columns, and format validation notes.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-2 text-xs border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <Download className="h-3.5 w-3.5" />
                Download Template (.xlsx)
              </Button>
            </div>

            {/* Step 1B: Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all text-center space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold">Click to browse or drag and drop your Excel file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls and .csv files up to 10MB</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Validation Table */}
        {step === 2 && (
          <div className="py-4 space-y-4 flex-1 flex flex-col min-h-0">
            {/* Stats & Filter Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setFilterView('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterView === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  onClick={() => setFilterView('valid')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterView === 'valid' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}
                >
                  Valid ({validCount})
                </button>
                <button
                  onClick={() => setFilterView('invalid')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterView === 'invalid' ? 'bg-rose-600 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}
                >
                  Errors ({invalidCount})
                </button>
              </div>

              {invalidCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrorReport}
                  className="h-8 gap-1.5 text-xs text-rose-600 dark:text-rose-400"
                >
                  <Download className="h-3 w-3" />
                  Download Error Rows
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-xl border">
              <Table>
                <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-16 text-center">Row</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-64">Validation Notes</TableHead>
                    {columns.slice(0, 5).map(col => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                        No rows matching filter
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayRows.slice(0, 50).map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={row._isValid ? 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10' : 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/60'}
                      >
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {row._rowNumber}
                        </TableCell>
                        <TableCell>
                          {row._isValid ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 gap-1 text-[10px]">
                              <XCircle className="h-3 w-3" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row._isValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Ready to import</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              {row._errors.join('; ')}
                            </span>
                          )}
                        </TableCell>
                        {columns.slice(0, 5).map(col => (
                          <TableCell key={col} className="text-xs max-w-[160px] truncate">
                            {String(row[col] || '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {displayRows.length > 50 && (
              <p className="text-[11px] text-muted-foreground text-center">
                Showing first 50 of {displayRows.length} rows in preview
              </p>
            )}
          </div>
        )}

        {/* STEP 3: Results Summary */}
        {step === 3 && importResult && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Import Completed!</h3>
              <p className="text-xs text-muted-foreground">
                Your Excel file records have been parsed and loaded into the CRM.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50">
                <span className="text-xs text-muted-foreground">Total Rows</span>
                <p className="text-2xl font-bold mt-1">{importResult.total}</p>
              </div>
              <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-600 font-medium">Imported</span>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult.imported}</p>
              </div>
              <div className="p-4 rounded-xl border bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800">
                <span className="text-xs text-rose-600 font-medium">Failed</span>
                <p className="text-2xl font-bold text-rose-600 mt-1">{importResult.failed}</p>
              </div>
            </div>

            {importResult.failed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadErrorReport}
                className="gap-2 text-xs text-rose-600"
              >
                <Download className="h-3.5 w-3.5" />
                Download Error Report (.xlsx)
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="pt-4 border-t flex items-center justify-between">
          {step === 1 && (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 2 && (
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Upload
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={isUploading || validCount === 0}
                  className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing {validCount} Records...
                    </>
                  ) : (
                    <>
                      Import {validCount} Valid Records
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <Button size="sm" onClick={handleClose} className="text-xs">
                Done & Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
