"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Monitor, Key } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit/login-history', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      if (res.data.success && res.data.data) {
        setHistory(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load login history');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'user',
      header: 'Employee & Email',
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground text-sm">{row.user_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Authentication Status',
      cell: (row) => {
        const isSuccess = row.status === 'success';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isSuccess
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
            }`}
          >
            {isSuccess ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {isSuccess ? 'Successful Login' : 'Failed Attempt'}
          </span>
        );
      },
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.ip_address || '—'}</span>,
    },
    {
      key: 'user_agent',
      header: 'Browser & Platform',
      cell: (row) => (
        <span className="text-xs text-muted-foreground max-w-[300px] truncate block" title={row.user_agent}>
          {row.user_agent || 'Unknown Client'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Login Time (IST)',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login History & Security Audit"
        subtitle="Track authentication attempts, successful sign-ins, IP origins, and suspicious login activity"
        breadcrumbs={[
          { label: 'Activity Logs', href: '/activity-logs/employees' },
          { label: 'Login History' },
        ]}
      />

      <DataTable
        columns={columns}
        data={history}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
          onPageChange: (newPage) => setPagination((p) => ({ ...p, page: newPage })),
          onLimitChange: (newLimit) => setPagination((p) => ({ ...p, limit: newLimit, page: 1 })),
        }}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search by employee or email...',
        }}
        emptyState={{
          icon: Key,
          title: 'No login records found',
          description: 'Login attempts will be logged automatically upon sign-in.',
        }}
      />
    </div>
  );
}

