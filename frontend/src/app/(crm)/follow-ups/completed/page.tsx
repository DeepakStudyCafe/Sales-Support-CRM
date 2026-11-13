"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CompletedTasksPage() {
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
          filter: 'completed',
        },
      });

      if (res.data.success && res.data.data) {
        setTasks(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load completed tasks');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const columns: ColumnDef<any>[] = [
    { key: 'title', header: 'Task Title' },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'scheduled_at', header: 'Scheduled Time', render: (t) => formatDate(t.scheduled_at) },
    { key: 'completed_at', header: 'Completed On (IST)', render: (t) => formatDate(t.completed_at) },
    { key: 'assigned_to_name', header: 'Completed By' },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Completed Tasks History"
        subtitle="Archived log of fulfilled customer follow-ups and completed callback activities"
        breadcrumbs={[
          { label: 'Follow-ups', href: '/follow-ups' },
          { label: 'Completed Tasks' },
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

