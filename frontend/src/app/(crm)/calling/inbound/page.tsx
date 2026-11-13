"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import api from '@/services/api';
import { toast } from 'sonner';

export default function InboundCallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/calls/history', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          direction: 'inbound',
        },
      });

      if (res.data.success && res.data.data) {
        setCalls(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load inbound calls');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const columns: ColumnDef<any>[] = [
    { key: 'caller_number', header: 'Incoming Phone Number' },
    { key: 'customer_number', header: 'Destination DID' },
    {
      key: 'matched',
      header: 'Matched CRM Record',
      render: (c) => c.customer_name || c.lead_name || <span className="text-muted-foreground italic">Unmatched</span>,
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'duration', header: 'Duration', render: (c) => `${c.duration || 0}s` },
    { key: 'initiated_at', header: 'Received At (IST)', render: (c) => formatDate(c.initiated_at) },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Inbound Calls"
        subtitle="Incoming customer calls received via DID with automatic CRM contact matching"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Inbound Calls' },
        ]}
      />

      <DataTable
        columns={columns}
        data={calls}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />
    </div>
  );
}

