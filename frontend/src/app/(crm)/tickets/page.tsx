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
import { Plus, Headphones, AlertTriangle } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AllTicketsPage() {
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
        },
      });

      if (res.data.success && res.data.data) {
        setTickets(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket #',
      render: (t) => (
        <Link
          href={`/tickets/${t.id}`}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {t.ticket_number}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Subject',
      render: (t) => (
        <div className="flex flex-col">
          <Link
            href={`/tickets/${t.id}`}
            className="font-semibold text-xs text-foreground hover:underline line-clamp-1"
          >
            {t.title}
          </Link>
          {t.customer_name && (
            <span className="text-[11px] text-muted-foreground">{t.customer_name}</span>
          )}
        </div>
      ),
    },
    { key: 'category_name', header: 'Category', render: (t) => t.category_name || 'General' },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'assigned_to_name', header: 'Assigned Specialist', render: (t) => t.assigned_to_name || 'Unassigned' },
    {
      key: 'sla',
      header: 'Resolution Target (IST)',
      render: (t) => {
        if (!t.resolution_due_at) return '-';
        const isOverdue = new Date(t.resolution_due_at).getTime() < Date.now() && !['Resolved', 'Closed'].includes(t.status);
        return (
          <span className={`text-xs ${isOverdue ? 'text-destructive font-bold flex items-center gap-1' : 'text-muted-foreground'}`}>
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
            {formatDate(t.resolution_due_at)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Support Tickets"
        subtitle="Manage customer support inquiries, SLA targets, team assignments and customer resolution"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'All Tickets' },
        ]}
        actions={
          <Link href="/tickets/create">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Create Ticket
            </Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={tickets}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        onSearch={(q) => {
          setSearchQuery(q);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search ticket subject or number..."
        filterSlot={
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Waiting for Customer">Waiting</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(val) => {
                setPriorityFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}

