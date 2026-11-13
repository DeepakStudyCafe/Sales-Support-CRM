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
import { Users, Plus } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AssignedTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      if (res.data.success && res.data.data) {
        setUsers(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          assignedTo: agentFilter !== 'all' ? agentFilter : undefined,
          search: searchQuery || undefined,
        },
      });

      if (res.data.success && res.data.data) {
        setTickets(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load assigned tickets');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, agentFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, []);

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
            Customer: {row.customer_name || 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      key: 'assigned_to_name',
      header: 'Assigned Agent',
      cell: (row) => (
        <span className="text-sm font-medium">
          {row.assigned_to_name || <span className="text-muted-foreground italic">Unassigned</span>}
        </span>
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
      key: 'created_at',
      header: 'Created',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      cell: (row) => (
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href={`/tickets/${row.id}`}>Manage</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned Tickets"
        subtitle="Overview of support tickets across all support agents and teams"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'Assigned Tickets' },
        ]}
        actions={
          <Button asChild className="gap-2">
            <Link href="/tickets/create">
              <Plus className="h-4 w-4" /> Create Ticket
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={agentFilter} onValueChange={(val) => { setAgentFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          placeholder: 'Search assigned tickets...',
        }}
        emptyState={{
          icon: Users,
          title: 'No assigned tickets found',
          description: 'Try adjusting filters or assigning tickets to agents.',
        }}
      />
    </div>
  );
}

