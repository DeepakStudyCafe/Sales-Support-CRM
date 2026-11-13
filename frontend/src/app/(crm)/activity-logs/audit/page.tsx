"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Shield, Eye, FileText } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function SystemAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          action: actionFilter !== 'all' ? actionFilter : undefined,
        },
      });

      if (res.data.success && res.data.data) {
        setLogs(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load system audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'action',
      header: 'Operation',
      cell: (row) => {
        let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
        if (row.action === 'CREATE') variant = 'default';
        if (row.action === 'DELETE') variant = 'destructive';
        return <Badge variant={variant} className="text-xs font-mono">{row.action}</Badge>;
      },
    },
    {
      key: 'entity_type',
      header: 'Entity Class',
      cell: (row) => <span className="font-semibold text-xs text-foreground uppercase tracking-wider">{row.entity_type}</span>,
    },
    {
      key: 'entity_id',
      header: 'Record Identifier',
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.entity_id || 'System Event'}
        </span>
      ),
    },
    {
      key: 'user_name',
      header: 'Initiated By',
      cell: (row) => <span className="text-sm font-medium">{row.user_name || 'System Daemon'}</span>,
    },
    {
      key: 'created_at',
      header: 'Timestamp (IST)',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Details',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setSelectedLog(row)}
        >
          <Eye className="h-3.5 w-3.5" /> Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail"
        subtitle="Immutable audit trail of database operations, security mutations, and administrative overrides"
        breadcrumbs={[
          { label: 'Activity Logs', href: '/activity-logs/employees' },
          { label: 'System Audit Logs' },
        ]}
      />

      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            <SelectItem value="CREATE">CREATE</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={logs}
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
          placeholder: 'Search audit records...',
        }}
        emptyState={{
          icon: Shield,
          title: 'No audit records found',
          description: 'Audited entity changes will be recorded here.',
        }}
      />

      {/* Inspect Log Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg">
                <div>
                  <span className="text-muted-foreground block">Action:</span>
                  <span className="font-semibold text-foreground">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Entity:</span>
                  <span className="font-semibold text-foreground">{selectedLog.entity_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Performed By:</span>
                  <span className="font-semibold text-foreground">{selectedLog.user_name || 'System'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">IP Address:</span>
                  <span className="font-mono text-foreground">{selectedLog.ip_address || 'Internal'}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Payload & Mutated State (JSON):
                </label>
                <pre className="p-3 bg-card border rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed max-h-64">
                  {selectedLog.new_values || selectedLog.old_values
                    ? JSON.stringify(
                        {
                          old: selectedLog.old_values ? JSON.parse(selectedLog.old_values) : null,
                          new: selectedLog.new_values ? JSON.parse(selectedLog.new_values) : null,
                        },
                        null,
                        2
                      )
                    : 'No serialized state captured.'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

