"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaginationMeta } from '@/types/api';
import api from '@/services/api';
import { toast } from 'sonner';
import { UserCheck, Users, ArrowRightLeft, CheckCircle2, AlertCircle, X, Shield, Phone, Building } from 'lucide-react';
import Link from 'next/link';

export default function LeadAssignmentPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetAgent, setTargetAgent] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedAgentFilter !== 'all') {
        params.assignedTo = selectedAgentFilter;
      }
      const res = await api.get('/leads', { params });
      if (res.data.success && res.data.data) {
        setLeads(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load leads list');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedAgentFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await api.get('/users/assignable').catch(() => api.get('/users?limit=100&isActive=true'));
        if (res.data?.success && Array.isArray(res.data?.data)) {
          setUsers(res.data.data);
        }
      } catch (err: any) {
        console.error('Failed to load agents list', err);
      }
    }
    loadAgents();
  }, []);

  // Filter leads based on active tab
  const filteredLeads = useMemo(() => {
    if (activeTab === 'unassigned') {
      return leads.filter((l) => !l.assigned_to);
    }
    if (activeTab === 'assigned') {
      return leads.filter((l) => !!l.assigned_to);
    }
    return leads;
  }, [leads, activeTab]);

  // Selected lead records
  const selectedLeadObjects = useMemo(() => {
    return leads.filter((l) => selectedIds.includes(String(l.id)));
  }, [leads, selectedIds]);

  // Filtered users for assignment
  const filteredAssignableUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter((u) => u.role_name === roleFilter);
  }, [users, roleFilter]);

  const handleBulkAssign = async () => {
    if (!targetAgent) {
      toast.error('Please select an agent to assign these leads to');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Please select at least one lead');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/leads/bulk-assign', {
        leadIds: selectedIds,
        assignedTo: targetAgent,
      });

      if (res.data.success) {
        const targetObj = users.find((u) => u.id === targetAgent);
        const agentName = targetObj ? `${targetObj.first_name} ${targetObj.last_name}` : 'selected agent';
        toast.success(`Successfully assigned ${selectedIds.length} lead(s) to ${agentName}`);
        setAssignModalOpen(false);
        setSelectedIds([]);
        setTargetAgent('');
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
        <div className="flex flex-col">
          <Link href={`/leads/${l.id}`} className="font-semibold text-primary hover:underline flex items-center gap-1.5">
            {l.first_name} {l.last_name || ''}
          </Link>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building className="h-3 w-3" /> {l.company || 'Individual'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Info',
      render: (l) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" /> {l.phone}
          </span>
          {l.email && <span className="text-[11px] text-muted-foreground">{l.email}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <StatusBadge status={l.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (l) => {
        const p = l.priority || 'Medium';
        const colors: Record<string, string> = {
          High: 'bg-red-500/10 text-red-600 border-red-500/20',
          Urgent: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          Low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        };
        return <Badge variant="outline" className={`text-[10px] font-semibold ${colors[p] || colors.Medium}`}>{p}</Badge>;
      },
    },
    {
      key: 'assigned_to_name',
      header: 'Current Assignee',
      render: (l) => (
        <div className="flex items-center gap-1.5">
          {l.assigned_to_name ? (
            <Badge variant="secondary" className="font-medium text-xs bg-muted/60">
              <Users className="h-3 w-3 mr-1 text-primary" />
              {l.assigned_to_name}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 font-semibold text-xs bg-amber-500/5">
              <AlertCircle className="h-3 w-3 mr-1" /> Unassigned
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'source_name',
      header: 'Lead Source',
      render: (l) => <span className="text-xs text-muted-foreground">{l.source_name || 'Direct / Web'}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Lead Assignment & Ownership Distribution"
        subtitle="Select leads and allocate them to Sales, Support, or Admin executives with transparent accountability"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Lead Assignment' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => setAssignModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <UserCheck className="h-3.5 w-3.5" /> Assign Selected Leads ({selectedIds.length})
            </Button>
          </div>
        }
      />

      {/* Tabs and Quick Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Leads ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unassigned')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'unassigned'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            Unassigned Pool ({leads.filter((l) => !l.assigned_to).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assigned')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'assigned'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Assigned Leads ({leads.filter((l) => !!l.assigned_to).length})
          </button>
        </div>

        {/* Filter by assigned employee */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Filter by Employee:</Label>
          <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.role_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Leads Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold px-2 py-0.5">
              {selectedIds.length} Selected
            </Badge>
            <span className="text-xs font-medium text-foreground">
              Ready to allocate to an employee.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 text-xs gap-1 border-primary/30"
            >
              <X className="h-3 w-3" /> Clear Selection
            </Button>
            <Button
              size="sm"
              onClick={() => setAssignModalOpen(true)}
              className="h-7 text-xs gap-1.5 font-semibold"
            >
              <ArrowRightLeft className="h-3 w-3" /> Choose Assignee & Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Main Leads Table */}
      <DataTable
        columns={columns}
        data={filteredLeads}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
      />

      {/* Reassign Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Assign {selectedIds.length} Selected Lead{selectedIds.length > 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Selected Leads Summary Box */}
            <div className="rounded-lg border bg-muted/30 p-3 max-h-36 overflow-y-auto space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Selected Leads for Transfer ({selectedIds.length})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedLeadObjects.map((l) => (
                  <Badge key={l.id} variant="secondary" className="text-xs py-0.5 px-2 font-normal">
                    {l.first_name} {l.last_name || ''} ({l.phone})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Role Filter Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Filter Assignees by Role:</Label>
              <div className="flex items-center gap-1.5">
                {['all', 'Sales', 'Support', 'Admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                      roleFilter === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {r === 'all' ? 'All Roles' : `${r} Users`}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Agent Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" required>
                Select Employee / Executive
              </Label>
              <Select value={targetAgent} onValueChange={setTargetAgent}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Choose an active user..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredAssignableUsers.length === 0 ? (
                    <div className="p-3 text-xs text-center text-muted-foreground">
                      No active users found for this role.
                    </div>
                  ) : (
                    filteredAssignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {u.first_name} {u.last_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({u.role_name || 'Agent'} - {u.email})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold">
                Assignment Note / Reason (Optional)
              </Label>
              <Input
                id="reason"
                placeholder="e.g. Inbound inquiry distribution, territory realignment"
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkAssign}
              isLoading={isSubmitting}
              className="font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
