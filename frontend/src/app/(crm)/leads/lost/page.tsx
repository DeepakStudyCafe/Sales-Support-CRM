"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LostLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchLostLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leads', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: 'Lost',
        },
      });
      if (res.data.success && res.data.data) {
        setLeads(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load lost leads');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchLostLeads();
  }, [fetchLostLeads]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Lead Name',
      render: (l) => (
        <Link href={`/leads/${l.id}`} className="font-semibold text-primary hover:underline">
          {l.first_name} {l.last_name || ''}
        </Link>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'company', header: 'Company', render: (l) => l.company || '-' },
    {
      key: 'lost_reason',
      header: 'Recorded Lost Reason',
      render: (l) => (
        <span className="text-xs text-rose-600 font-medium italic">
          {l.lost_reason || 'No specific reason recorded'}
        </span>
      ),
    },
    {
      key: 'assigned_to_name',
      header: 'Assigned Agent',
      render: (l) => l.assigned_to_name || 'Unassigned',
    },
    {
      key: 'updated_at',
      header: 'Closed Date',
      render: (l) => formatDate(l.lost_at || l.updated_at),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Lost Leads & Reasons"
        subtitle="Review dropped opportunities and analyze recorded objection reasons for continuous improvement"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Lost Leads' },
        ]}
      />

      <DataTable
        columns={columns}
        data={leads}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
      />
    </div>
  );
}

