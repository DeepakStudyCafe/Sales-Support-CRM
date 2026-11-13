"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Plus, Play, Pause, Square } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CallingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    dialerMode: 'progressive',
    callingWindowStart: '09:00',
    callingWindowEnd: '18:00',
    maxConcurrentCalls: 1,
    maxAttempts: 3,
  });

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/campaigns', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      if (res.data.success && res.data.data) {
        setCampaigns(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load calling campaigns');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/campaigns', formData);
      if (res.data.success) {
        toast.success('Campaign created successfully');
        setModalOpen(false);
        setFormData({
          name: '',
          dialerMode: 'progressive',
          callingWindowStart: '09:00',
          callingWindowEnd: '18:00',
          maxConcurrentCalls: 1,
          maxAttempts: 3,
        });
        fetchCampaigns();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await api.patch(`/campaigns/${id}/status`, { status });
      if (res.data.success) {
        toast.success(`Campaign ${status}`);
        fetchCampaigns();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'name', header: 'Campaign Name', sortable: true },
    { key: 'dialer_mode', header: 'Dialer Mode', render: (c) => <span className="capitalize">{c.dialer_mode}</span> },
    {
      key: 'window',
      header: 'Calling Window (IST)',
      render: (c) => `${c.calling_window_start} - ${c.calling_window_end}`,
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'progress',
      header: 'Progress',
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {c.completed_calls || 0} / {c.total_contacts || 0} dialed
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Controls',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {c.status !== 'Active' ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
              onClick={() => handleStatusChange(c.id, 'Active')}
              title="Start Campaign"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-amber-600 hover:bg-amber-50"
              onClick={() => handleStatusChange(c.id, 'Paused')}
              title="Pause Campaign"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => handleStatusChange(c.id, 'Stopped')}
            title="Stop Campaign"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Calling Campaigns"
        subtitle="Manage progressive, power and predictive automated calling dialer batches"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Calling Campaigns' },
        ]}
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)} className="h-9 gap-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Create Campaign
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={campaigns}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />

      {/* Create Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Outbound Dialer Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="campName" className="text-xs" required>
                  Campaign Name
                </Label>
                <Input
                  id="campName"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Q4 Festive Follow-up Blast"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Dialer Mode</Label>
                <Select
                  value={formData.dialerMode}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, dialerMode: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preview">Preview Dialing</SelectItem>
                    <SelectItem value="progressive">Progressive Dialing</SelectItem>
                    <SelectItem value="power">Power Dialing</SelectItem>
                    <SelectItem value="predictive">Predictive Dialing</SelectItem>
                    <SelectItem value="ivr_message">IVR Voice Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="windowStart" className="text-xs">
                    Start Window (IST)
                  </Label>
                  <Input
                    id="windowStart"
                    value={formData.callingWindowStart}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, callingWindowStart: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="windowEnd" className="text-xs">
                    End Window (IST)
                  </Label>
                  <Input
                    id="windowEnd"
                    value={formData.callingWindowEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, callingWindowEnd: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="maxConc" className="text-xs">
                    Max Concurrent Calls
                  </Label>
                  <Input
                    id="maxConc"
                    type="number"
                    value={formData.maxConcurrentCalls}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, maxConcurrentCalls: Number(e.target.value) }))
                    }
                    className="h-9 text-xs"
                    min={1}
                    max={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxAtt" className="text-xs">
                    Max Retry Attempts
                  </Label>
                  <Input
                    id="maxAtt"
                    type="number"
                    value={formData.maxAttempts}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, maxAttempts: Number(e.target.value) }))
                    }
                    className="h-9 text-xs"
                    min={1}
                    max={5}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSubmitting} className="font-semibold">
                Save Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

