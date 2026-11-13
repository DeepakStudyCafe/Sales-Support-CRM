"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PaginationMeta } from '@/types/api';
import api from '@/services/api';
import { toast } from 'sonner';
import { UserCheck, Users, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

export default function LeadAssignmentPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leads', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });
      if (res.data.success && res.data.data) {
        setLeads(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchLeads();
    async function loadAgents() {
      try {
        const res = await api.get('/users?limit=100&isActive=true');
        if (res.data.success && res.data.data) {
          setUsers(res.data.data);
        }
      } catch {
        // Ignored
      }
    }
    loadAgents();
  }, [fetchLeads]);

  const handleBulkAssign = async () => {
    if (!selectedAgent || selectedIds.length === 0) {
      toast.error('Select an agent and at least one lead');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/leads/bulk-assign', {
        leadIds: selectedIds,
        assignedTo: selectedAgent,
      });

      if (res.data.success) {
        toast.success(`Assigned ${selectedIds.length} leads to agent`);
        setAssignModalOpen(false);
        setSelectedIds([]);
        setSelectedAgent('');
        setAssignmentReason('');
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign leads');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'assigned_to_name',
      header: 'Currently Assigned',
      render: (l) => (
        <span className={l.assigned_to_name ? 'text-foreground font-medium' : 'text-amber-600 font-semibold italic'}>
          {l.assigned_to_name || 'Unassigned'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Lead Assignment & Reassignment"
        subtitle="Distribute and reassign leads across team members with complete ownership tracking"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Lead Assignment' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => setAssignModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <UserCheck className="h-3.5 w-3.5" /> Reassign Selected ({selectedIds.length})
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={leads}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
      />

      {/* Reassign Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Reassign {selectedIds.length} Selected Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs" required>
                Assignee Agent
              </Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs">
                Assignment Reason (Optional)
              </Label>
              <Input
                id="reason"
                placeholder="e.g. Territory realignment, agent on leave"
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkAssign}
              isLoading={isSubmitting}
              className="font-semibold"
            >
              Execute Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

