"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { PhoneCall, Volume2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/calls/history', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          direction: directionFilter !== 'all' ? directionFilter : undefined,
          search: searchQuery || undefined,
        },
      });

      if (res.data.success && res.data.data) {
        setCalls(res.data.data);
        if (res.data.pagination) {
          setPagination((prev) => {
            const next = res.data.pagination;
            if (
              prev.page === next.page &&
              prev.limit === next.limit &&
              prev.total === next.total &&
              prev.totalPages === next.totalPages
            ) {
              return prev;
            }
            return next;
          });
        }
      }
    } catch {
      toast.error('Failed to load call logs');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, directionFilter, searchQuery]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handlePageChange = useCallback((p: number) => {
    setPagination((prev) => ({ ...prev, page: p }));
  }, []);

  const handleLimitChange = useCallback((l: number) => {
    setPagination((prev) => ({ ...prev, limit: l, page: 1 }));
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const columns: ColumnDef<any>[] = [
    {
      key: 'direction',
      header: 'Direction',
      render: (c) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold capitalize">
          {c.direction === 'inbound' ? (
            <>
              <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" /> Inbound
            </>
          ) : (
            <>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> Outbound
            </>
          )}
        </span>
      ),
    },
    { key: 'customer_number', header: 'Customer Number' },
    { key: 'caller_number', header: 'Agent / Caller' },
    {
      key: 'agent_name',
      header: 'Assigned Agent',
      render: (c) => c.agent_name || 'System',
    },
    {
      key: 'status',
      header: 'Call Status',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'outcome',
      header: 'Disposition',
      render: (c) => (c.outcome ? <StatusBadge status={c.outcome} /> : '-'),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (c) => `${c.duration || 0}s`,
    },
    {
      key: 'recording_url',
      header: 'Audio',
      render: (c) =>
        c.recording_url ? (
          <a
            href={c.recording_url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline text-xs inline-flex items-center gap-1 font-medium"
          >
            <Volume2 className="h-3.5 w-3.5" /> Play
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
    {
      key: 'initiated_at',
      header: 'Date & Time (IST)',
      render: (c) => formatDate(c.initiated_at),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Telephony Call History"
        subtitle="Complete synchronized interaction records, durations, audio recordings and dispositions"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Call History' },
        ]}
        actions={
          <Link href="/calling/click-to-call">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <PhoneCall className="h-3.5 w-3.5" /> Make a Call
            </Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={calls}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSearch={handleSearch}
        searchPlaceholder="Search by phone number..."
        filterSlot={
          <Select
            value={directionFilter}
            onValueChange={(val) => {
              setDirectionFilter(val);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}

