"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function TicketEscalationsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEscalations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery || undefined,
        },
      });

      if (res.data.success && res.data.data) {
        // Filter tickets that are overdue or urgent/critical and not yet resolved/closed
        const now = new Date();
        const escalated = res.data.data.filter((t: any) => {
          const isOverdue = t.resolution_due_at && new Date(t.resolution_due_at) < now;
          const isHighSev = ['Urgent', 'Critical'].includes(t.priority);
          const isPending = !['Resolved', 'Closed'].includes(t.status);
          return isPending && (isOverdue || isHighSev);
        });

        setTickets(escalated);
        if (res.data.pagination) {
          setPagination({
            ...res.data.pagination,
            total: escalated.length,
            totalPages: Math.max(1, Math.ceil(escalated.length / pagination.limit)),
          });
        }
      }
    } catch {
      toast.error('Failed to load escalation queue');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket #',
      cell: (row) => (
        <Link
          href={`/tickets/${row.id}`}
          className="font-mono text-sm font-semibold text-primary hover:underline"
        >
          {row.ticket_number}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Subject & Customer',
      cell: (row) => (
        <div className="max-w-[280px]">
          <Link href={`/tickets/${row.id}`} className="font-medium hover:underline block truncate">
            {row.title}
          </Link>
          <span className="text-xs text-muted-foreground block truncate">
            Customer: {row.customer_name || 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'assigned_to_name',
      header: 'Current Agent',
      cell: (row) => (
        <span className="text-sm">
          {row.assigned_to_name || <span className="text-red-500 font-semibold text-xs">Unassigned!</span>}
        </span>
      ),
    },
    {
      key: 'resolution_due_at',
      header: 'SLA Status',
      cell: (row) => {
        const isOverdue = row.resolution_due_at && new Date(row.resolution_due_at) < new Date();
        return (
          <div className="flex items-center gap-1.5 text-xs">
            {isOverdue ? (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Breached ({formatDate(row.resolution_due_at)})
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Due soon ({formatDate(row.resolution_due_at)})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      cell: (row) => (
        <Button asChild size="sm" variant="destructive" className="h-8 text-xs gap-1">
          <Link href={`/tickets/${row.id}`}>
            Resolve Now <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalations & Overdue Queue"
        subtitle="Critical tickets requiring immediate intervention, supervisor review, or breached SLA"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'Escalations' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-red-500/10 border-red-500/20 p-4">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">Total Escalated / Overdue</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{tickets.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Urgent / Critical Priority</p>
          <p className="text-2xl font-bold mt-1">
            {tickets.filter(t => ['Urgent', 'Critical'].includes(t.priority)).length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Unassigned In Queue</p>
          <p className="text-2xl font-bold mt-1">
            {tickets.filter(t => !t.assigned_to).length}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
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
          placeholder: 'Search escalations...',
        }}
        emptyState={{
          icon: AlertTriangle,
          title: 'No escalations or overdue tickets',
          description: 'All tickets are within SLA and no high-severity escalations are pending.',
        }}
      />
    </div>
  );
}

