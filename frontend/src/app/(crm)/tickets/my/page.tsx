"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Headphones, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          search: searchQuery || undefined,
          assignedTo: user?.id,
        },
      });

      if (res.data.success && res.data.data) {
        setTickets(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load your assigned tickets');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, searchQuery, user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
      header: 'Subject',
      cell: (row) => (
        <div className="max-w-[280px]">
          <Link href={`/tickets/${row.id}`} className="font-medium hover:underline block truncate">
            {row.title}
          </Link>
          <span className="text-xs text-muted-foreground block truncate">
            {row.customer_name || 'No customer linked'}
          </span>
        </div>
      ),
    },
    {
      key: 'category_name',
      header: 'Category',
      cell: (row) => <span className="text-sm">{row.category_name || 'General'}</span>,
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
      key: 'resolution_due_at',
      header: 'SLA Resolution Due',
      cell: (row) => {
        if (!row.resolution_due_at) return <span className="text-muted-foreground text-xs">No SLA</span>;
        const isOverdue = new Date(row.resolution_due_at) < new Date() && !['Resolved', 'Closed'].includes(row.status);
        return (
          <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
            {formatDate(row.resolution_due_at)}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      cell: (row) => (
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href={`/tickets/${row.id}`}>Open</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Support Tickets"
        subtitle="Manage tickets currently assigned to you"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'My Tickets' },
        ]}
        actions={
          <Button asChild className="gap-2">
            <Link href="/tickets/create">
              <Plus className="h-4 w-4" /> Create Ticket
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Waiting for Customer">Waiting for Customer</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(val) => { setPriorityFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
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
          placeholder: 'Search my tickets by subject or #...',
        }}
        emptyState={{
          icon: Headphones,
          title: 'No tickets assigned to you',
          description: 'You currently have no open or pending support tickets assigned.',
        }}
      />
    </div>
  );
}

