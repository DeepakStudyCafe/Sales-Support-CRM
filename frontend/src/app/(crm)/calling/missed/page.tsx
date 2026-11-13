"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { PhoneCall, Calendar } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function MissedCallsPage() {
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
          status: 'missed',
        },
      });

      if (res.data.success && res.data.data) {
        setCalls(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load missed calls');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const columns: ColumnDef<any>[] = [
    { key: 'caller_number', header: 'Caller Number' },
    {
      key: 'matched',
      header: 'Identified Contact',
      render: (c) => c.customer_name || c.lead_name || 'Unknown Caller',
    },
    { key: 'customer_number', header: 'DID Line' },
    { key: 'initiated_at', header: 'Missed Call Time (IST)', render: (c) => formatDate(c.initiated_at) },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Missed Calls & Callbacks"
        subtitle="Unanswered incoming calls requiring rapid follow-up callback"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Missed Calls' },
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

