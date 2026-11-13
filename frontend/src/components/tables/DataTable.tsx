"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaginationMeta } from '@/types/api';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { BulkActionToolbar, BulkActionItem } from '@/components/shared/BulkActionToolbar';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode;
}

export interface DataTablePaginationProps extends Partial<PaginationMeta> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination: DataTablePaginationProps;
  isLoading?: boolean;
  error?: string;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSearch?: (query: string) => void;
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  searchPlaceholder?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  emptyState?: {
    icon?: any;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  onExport?: () => void;
  selectedIds?: string[];
  onSelectChange?: (selectedIds: string[]) => void;
  idKey?: keyof T;
  filterSlot?: React.ReactNode;
  extraActionsSlot?: React.ReactNode;
  bulkActions?: BulkActionItem[];
  onSelectAllFiltered?: () => void;
  isAllFilteredSelected?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pagination,
  isLoading = false,
  onPageChange,
  onLimitChange,
  onSearch,
  onSort,
  searchPlaceholder = 'Search records...',
  search,
  emptyState,
  onExport,
  selectedIds = [],
  onSelectChange,
  idKey = 'id' as keyof T,
  filterSlot,
  extraActionsSlot,
  bulkActions = [],
  onSelectAllFiltered,
  isAllFilteredSelected = false,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const debouncedSearch = useDebounce(internalSearch, 400);

  const effectivePageChange = onPageChange || pagination?.onPageChange || (() => {});
  const effectiveLimitChange = onLimitChange || pagination?.onLimitChange;

  const onSearchRef = React.useRef(onSearch);
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (!debouncedSearch) return;
    }
    if (onSearchRef.current) {
      onSearchRef.current(debouncedSearch);
    }
  }, [debouncedSearch]);

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    const newOrder = sortCol === columnKey && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortCol(columnKey);
    setSortOrder(newOrder);
    onSort(columnKey, newOrder);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectChange) return;
    if (checked) {
      const allIds = data.map((d) => String(d[idKey]));
      onSelectChange(allIds);
    } else {
      onSelectChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectChange) return;
    if (checked) {
      onSelectChange([...selectedIds, id]);
    } else {
      onSelectChange(selectedIds.filter((item) => item !== id));
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          {search ? (
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={search.placeholder || searchPlaceholder}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          ) : onSearch ? (
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          ) : null}
          {filterSlot}
        </div>

        <div className="flex items-center gap-2">
          {extraActionsSlot}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-9 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Cross-page selection notification banner */}
      {isAllSelected && pagination.total > data.length && onSelectAllFiltered && (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl py-2 px-4 text-xs flex items-center justify-center gap-2 text-indigo-900 dark:text-indigo-200 animate-in fade-in duration-150">
          <span>
            {isAllFilteredSelected
              ? `All ${pagination.total} records across all pages are selected.`
              : `All ${data.length} records on this page are selected.`}
          </span>
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="font-semibold underline hover:text-indigo-600 dark:hover:text-indigo-300 ml-1"
          >
            {isAllFilteredSelected
              ? `Clear selection`
              : `Select all ${pagination.total} records matching current filter`}
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectChange && (
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-muted-foreground">
                        {sortCol === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (onSelectChange ? 1 : 0)}
                  className="h-48 text-center"
                >
                  <LoadingSpinner text="Loading records..." />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (onSelectChange ? 1 : 0)}
                  className="h-48 text-center"
                >
                  {emptyState ? (
                    <EmptyState
                      icon={emptyState.icon}
                      title={emptyState.title}
                      description={emptyState.description}
                      actionLabel={emptyState.actionLabel}
                      onAction={emptyState.onAction}
                    />
                  ) : (
                    <EmptyState />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => {
                const rowId = String(row[idKey] ?? idx);
                const isSelected = selectedIds.includes(rowId);
                return (
                  <TableRow
                    key={rowId}
                    data-state={isSelected ? 'selected' : undefined}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {onSelectChange && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(rowId, !!checked)}
                          aria-label={`Select row ${rowId}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.cell ? col.cell(row) : col.render ? col.render(row) : row[col.key] ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            Showing{' '}
            <strong className="text-foreground">
              {data.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-foreground">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </strong>{' '}
            of <strong className="text-foreground">{pagination.total}</strong> results
          </span>
          {effectiveLimitChange && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs">Rows:</span>
              <Select
                value={String(pagination.limit)}
                onValueChange={(val) => effectiveLimitChange(Number(val))}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => effectivePageChange(1)}
            disabled={pagination.page <= 1 || isLoading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => effectivePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-3 text-xs font-medium text-foreground">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => effectivePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => effectivePageChange(pagination.totalPages)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Floating Bulk Action Toolbar */}
      {selectedIds.length > 0 && bulkActions.length > 0 && (
        <BulkActionToolbar
          selectedCount={selectedIds.length}
          totalCount={pagination.total}
          onClearSelection={() => onSelectChange && onSelectChange([])}
          onSelectAllFiltered={onSelectAllFiltered}
          isAllFilteredSelected={isAllFilteredSelected}
          actions={bulkActions}
        />
      )}
    </div>
  );
}
