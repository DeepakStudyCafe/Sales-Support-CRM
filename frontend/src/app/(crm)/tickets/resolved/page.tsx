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
import { CheckCircle2, Headphones } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ResolvedTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Resolved');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter,
          search: searchQuery || undefined,
        },
      });

      if (res.data.success && res.data.data) {
        setTickets(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load resolved tickets');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

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
      key: 'category_name',
      header: 'Category',
      cell: (row) => <span className="text-sm">{row.category_name || 'General'}</span>,
    },
    {
      key: 'assigned_to_name',
      header: 'Resolved By',
      cell: (row) => <span className="text-sm font-medium">{row.assigned_to_name || 'Support Agent'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'resolved_at',
      header: 'Resolved Date',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.resolved_at ? formatDate(row.resolved_at) : formatDate(row.updated_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      cell: (row) => (
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href={`/tickets/${row.id}`}>View Record</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resolved & Closed Tickets"
        subtitle="Archive of successfully completed customer support cases"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'Resolved Tickets' },
        ]}
      />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Resolved">Resolved Tickets</SelectItem>
            <SelectItem value="Closed">Closed Tickets</SelectItem>
          </SelectContent>
        </Select>
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
          placeholder: 'Search resolved tickets...',
        }}
        emptyState={{
          icon: CheckCircle2,
          title: 'No resolved tickets found',
          description: 'No tickets currently match the selected status filter.',
        }}
      />
    </div>
  );
}

