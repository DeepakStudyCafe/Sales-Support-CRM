"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Activity, User } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function EmployeeActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit/employee-activities', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      if (res.data.success && res.data.data) {
        setLogs(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load employee activities');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'user_name',
      header: 'Employee',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
            {row.user_name?.[0] || 'U'}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{row.user_name || 'System Worker'}</p>
            {row.role_name && <p className="text-[10px] text-muted-foreground">{row.role_name}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action Taken',
      cell: (row) => {
        let variant: 'default' | 'secondary' | 'outline' = 'secondary';
        if (row.action === 'CREATE') variant = 'default';
        return <Badge variant={variant} className="text-xs">{row.action}</Badge>;
      },
    },
    {
      key: 'entity_type',
      header: 'Entity / Module',
      cell: (row) => (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">
          {row.entity_type} {row.entity_id ? `(${row.entity_id.substring(0, 8)}...)` : ''}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.ip_address || '—'}</span>,
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Activities Log"
        subtitle="Chronological audit stream of actions performed across CRM leads, calls, deals, and tickets"
        breadcrumbs={[
          { label: 'Activity Logs', href: '/activity-logs/employees' },
          { label: 'Employee Activities' },
        ]}
      />

      <DataTable
        columns={columns}
        data={logs}
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
          placeholder: 'Filter by employee...',
        }}
        emptyState={{
          icon: Activity,
          title: 'No activity logs found',
          description: 'Employee actions will appear here in real-time as users interact with the CRM.',
        }}
      />
    </div>
  );
}

