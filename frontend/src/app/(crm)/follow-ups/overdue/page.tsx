"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function OverdueTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/follow-ups', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          filter: 'overdue',
        },
      });

      if (res.data.success && res.data.data) {
        setTasks(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load overdue tasks');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleMarkComplete = async (id: string) => {
    try {
      const res = await api.patch(`/follow-ups/${id}/complete`, {});
      if (res.data.success) {
        toast.success('Task completed');
        fetchTasks();
      }
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'title', header: 'Overdue Task' },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    {
      key: 'scheduled_at',
      header: 'Deadline Breached',
      render: (t) => <span className="text-destructive font-semibold">{formatDate(t.scheduled_at)}</span>,
    },
    { key: 'assigned_to_name', header: 'Responsible Agent' },
    {
      key: 'actions',
      header: 'Action',
      render: (t) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs text-emerald-600 hover:bg-emerald-50"
          onClick={() => handleMarkComplete(t.id)}
        >
          <CheckCircle className="h-3.5 w-3.5" /> Resolve Now
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Overdue Tasks & Breaches"
        subtitle="Uncompleted follow-ups that have breached scheduled commitments"
        breadcrumbs={[
          { label: 'Follow-ups', href: '/follow-ups' },
          { label: 'Overdue Tasks' },
        ]}
      />

      <DataTable
        columns={columns}
        data={tasks}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />
    </div>
  );
}

