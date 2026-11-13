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
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
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
    title: '',
    value: '',
    stage: 'Prospecting',
    expectedCloseDate: '',
  });

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/opportunities', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });
      if (res.data.success && res.data.data) {
        setOpportunities(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load opportunities');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/opportunities', {
        title: formData.title,
        value: formData.value ? Number(formData.value) : undefined,
        stage: formData.stage,
        expectedCloseDate: formData.expectedCloseDate || undefined,
      });

      if (res.data.success) {
        toast.success('Opportunity created');
        setModalOpen(false);
        setFormData({ title: '', value: '', stage: 'Prospecting', expectedCloseDate: '' });
        fetchOpportunities();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create opportunity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'title', header: 'Opportunity Title', sortable: true },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (o) => formatCurrency(o.value, o.currency),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (o) => <StatusBadge status={o.stage} />,
    },
    {
      key: 'assigned_to_name',
      header: 'Assigned Agent',
      render: (o) => o.assigned_to_name || 'Unassigned',
    },
    {
      key: 'expected_close_date',
      header: 'Expected Close',
      render: (o) => (o.expected_close_date ? formatDate(o.expected_close_date) : '-'),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Sales Opportunities"
        subtitle="Pipeline deals, negotiation values, forecasted revenue and closing targets"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Opportunities' },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Create Opportunity
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={opportunities}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
      />

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Sales Opportunity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="oppTitle" className="text-xs" required>
                  Opportunity Title
                </Label>
                <Input
                  id="oppTitle"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Enterprise License - Annual"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oppValue" className="text-xs">
                  Expected Deal Value (₹)
                </Label>
                <Input
                  id="oppValue"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g. 250000"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Sales Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, stage: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prospecting">Prospecting</SelectItem>
                    <SelectItem value="Qualification">Qualification</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Closed Won">Closed Won</SelectItem>
                    <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oppDate" className="text-xs">
                  Target Closing Date
                </Label>
                <Input
                  id="oppDate"
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, expectedCloseDate: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSubmitting} className="font-semibold">
                Create Deal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

