"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Volume2 } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CallRecordingsPage() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/calls/history', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      if (res.data.success && res.data.data) {
        // Filter those with recording URLs or simulated mock recordings
        const withRecordings = res.data.data.filter((c: any) => c.recording_url);
        setRecordings(withRecordings);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load call recordings');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const columns: ColumnDef<any>[] = [
    { key: 'customer_number', header: 'Customer Number' },
    { key: 'caller_number', header: 'Agent / Extension' },
    { key: 'duration', header: 'Duration', render: (c) => `${c.duration || 0} seconds` },
    {
      key: 'audio',
      header: 'Audio Player',
      render: (c) => (
        <audio controls src={c.recording_url} className="h-8 max-w-[200px]" />
      ),
    },
    { key: 'initiated_at', header: 'Recorded Date (IST)', render: (c) => formatDate(c.initiated_at) },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Call Audio Recordings"
        subtitle="Secure playback of telephony audio recordings synchronized from IVR Solutions"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Call Recordings' },
        ]}
      />

      <DataTable
        columns={columns}
        data={recordings}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />
    </div>
  );
}

