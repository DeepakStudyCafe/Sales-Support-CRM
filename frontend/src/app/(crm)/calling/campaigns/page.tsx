"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PaginationMeta } from '@/types/api';
import {
  Plus,
  Play,
  Pause,
  Square,
  Users,
  Eye,
  PhoneCall,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserCheck,
  Building,
  Calendar,
  Layers,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CallingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Create Campaign Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    dialerMode: 'progressive',
    purpose: '',
    callingWindowStart: '09:00',
    callingWindowEnd: '18:00',
    maxConcurrentCalls: 1,
    maxAttempts: 3,
    pacingIntervalSeconds: 30,
  });

  // Campaign Detail & Agent Progress Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [agentProgress, setAgentProgress] = useState<any[]>([]);
  const [campaignContacts, setCampaignContacts] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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
    // Load active users
    async function loadData() {
      try {
        const [uRes, lRes] = await Promise.all([
          api.get('/users?limit=100&isActive=true'),
          api.get('/leads?limit=100'),
        ]);
        if (uRes.data.success && uRes.data.data) setAvailableUsers(uRes.data.data);
        if (lRes.data.success && lRes.data.data) setAvailableLeads(lRes.data.data);
      } catch {
        // ignore
      }
    }
    loadData();
  }, [fetchCampaigns]);

  // Open Campaign Drilldown Modal
  const handleViewCampaignDetails = async (campaign: any) => {
    setSelectedCampaign(campaign);
    setDetailModalOpen(true);
    setIsLoadingDetails(true);

    try {
      const [campRes, progRes, contRes] = await Promise.all([
        api.get(`/campaigns/${campaign.id}`),
        api.get(`/campaigns/${campaign.id}/agent-progress`),
        api.get(`/campaigns/${campaign.id}/contacts`),
      ]);

      if (campRes.data.success) {
        setSelectedCampaign(campRes.data.data);
      }
      if (progRes.data.success && progRes.data.data) {
        setAgentProgress(progRes.data.data);
      }
      if (contRes.data.success && contRes.data.data) {
        setCampaignContacts(contRes.data.data);
      }
    } catch {
      toast.error('Failed to load campaign progress details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Campaign name is required');
      return;
    }
    if (selectedAgents.length === 0) {
      toast.error('Please assign at least one agent (Admin, Sales, or Support)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        assignedAgents: selectedAgents,
        assignedTo: selectedAgents[0],
        leadIds: selectedLeadIds,
      };

      const res = await api.post('/campaigns', payload);
      if (res.data.success) {
        toast.success(`Campaign "${formData.name}" created with ${selectedAgents.length} assigned agent(s)`);
        setCreateModalOpen(false);
        setFormData({
          name: '',
          dialerMode: 'progressive',
          purpose: '',
          callingWindowStart: '09:00',
          callingWindowEnd: '18:00',
          maxConcurrentCalls: 1,
          maxAttempts: 3,
          pacingIntervalSeconds: 30,
        });
        setSelectedAgents([]);
        setSelectedLeadIds([]);
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
        toast.success(`Campaign status changed to ${status}`);
        fetchCampaigns();
      }
    } catch {
      toast.error('Failed to update campaign status');
    }
  };

  const toggleAgent = (userId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const selectAllFilteredLeads = () => {
    const ids = availableLeads.map((l) => l.id);
    setSelectedLeadIds(ids);
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Campaign Name',
      sortable: true,
      render: (c) => (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => handleViewCampaignDetails(c)}
            className="font-semibold text-primary hover:underline text-left flex items-center gap-1.5"
          >
            {c.name}
          </button>
          <span className="text-[11px] text-muted-foreground">
            Created by {c.created_by_name || 'System Admin'}
          </span>
        </div>
      ),
    },
    {
      key: 'dialer_mode',
      header: 'Dialer Strategy',
      render: (c) => (
        <Badge variant="outline" className="capitalize text-xs font-semibold">
          {c.dialer_mode} Dialing
        </Badge>
      ),
    },
    {
      key: 'window',
      header: 'Calling Window',
      render: (c) => (
        <span className="text-xs text-foreground font-medium flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {c.calling_window_start} - {c.calling_window_end}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'assigned_agents',
      header: 'Assigned Agents',
      render: (c) => {
        let meta: any = {};
        try {
          meta = JSON.parse(c.purpose || '{}');
        } catch {
          meta = {};
        }
        const agentCount = meta.assignedAgents?.length || (c.assigned_to ? 1 : 0);
        return (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs font-medium">
              <Users className="h-3 w-3 mr-1 text-primary" />
              {agentCount > 1 ? `${agentCount} Assigned Agents` : c.assigned_to_name || 'Assigned'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: 'Lead Dialing Progress',
      render: (c) => {
        const total = c.total_contacts || 0;
        const dialed = c.completed_calls || 0;
        const pct = total > 0 ? Math.round((dialed / total) * 100) : 0;
        return (
          <div className="flex flex-col gap-1 w-36">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-foreground">{dialed} / {total}</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs gap-1 font-medium"
            onClick={() => handleViewCampaignDetails(c)}
            title="View Agent Progress & Leads"
          >
            <Eye className="h-3.5 w-3.5" /> Details
          </Button>

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
        title="Calling Campaigns & Progressive Dialing"
        subtitle="Provision outbound dialing batches, assign specific Admin, Sales, or Support executives, and track live agent conversion rates"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling' },
          { label: 'Calling Campaigns' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/calling/dialer">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" /> Open Agent Dialer Feed
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Create Campaign
            </Button>
          </div>
        }
      />

      {/* Main Campaigns Table */}
      <DataTable
        columns={columns}
        data={campaigns}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />

      {/* Create Campaign Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <PhoneCall className="h-5 w-5 text-primary" />
              Create Outbound Campaign with Agent Allocations
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-1">
            {/* 1. Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="campName" className="text-xs font-semibold" required>
                  Campaign Title
                </Label>
                <Input
                  id="campName"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Inbound Website Lead Follow-up Batch"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dialer Mode</Label>
                <Select
                  value={formData.dialerMode}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, dialerMode: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progressive">Progressive Dialing (Recommended)</SelectItem>
                    <SelectItem value="preview">Preview Dialing</SelectItem>
                    <SelectItem value="power">Power Dialing</SelectItem>
                    <SelectItem value="predictive">Predictive Dialing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. Calling Window & Timer Gap */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl border">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Window Start (IST)</Label>
                <Input
                  type="time"
                  value={formData.callingWindowStart}
                  onChange={(e) => setFormData((prev) => ({ ...prev, callingWindowStart: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Window End (IST)</Label>
                <Input
                  type="time"
                  value={formData.callingWindowEnd}
                  onChange={(e) => setFormData((prev) => ({ ...prev, callingWindowEnd: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Next Lead Pacing</Label>
                <Select
                  value={String(formData.pacingIntervalSeconds)}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, pacingIntervalSeconds: Number(val) }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Seconds</SelectItem>
                    <SelectItem value="30">30 Seconds</SelectItem>
                    <SelectItem value="60">60 Seconds</SelectItem>
                    <SelectItem value="120">2 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3. Assign Agents (Admin, Sales, Support) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5" required>
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Select Assigned Agents ({selectedAgents.length} chosen)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Leads will be evenly shared across selected agents
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 border rounded-xl bg-card">
                {availableUsers.map((u) => {
                  const isChecked = selectedAgents.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggleAgent(u.id)}
                      className={`flex flex-col text-left p-2 rounded-lg border text-xs transition-all ${
                        isChecked
                          ? 'border-primary bg-primary/10 text-primary font-semibold shadow-2xs'
                          : 'border-border bg-background hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <span className="truncate">{u.first_name} {u.last_name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {u.role_name || 'Agent'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Select Leads Pool */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Select Leads Pool ({selectedLeadIds.length} leads attached)
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFilteredLeads}
                    className="text-[11px] text-primary font-semibold hover:underline"
                  >
                    Select All ({availableLeads.length})
                  </button>
                  {selectedLeadIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLeadIds([])}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto p-2 border rounded-xl bg-card space-y-1">
                {availableLeads.slice(0, 50).map((l) => {
                  const isSelected = selectedLeadIds.includes(l.id);
                  return (
                    <div
                      key={l.id}
                      onClick={() => toggleLead(l.id)}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/30 font-medium' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-primary h-3.5 w-3.5"
                        />
                        <span className="font-semibold text-foreground">{l.first_name} {l.last_name || ''}</span>
                        <span className="text-[11px] text-muted-foreground">({l.phone})</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0">{l.status}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSubmitting} className="font-semibold gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Launch Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Details & Agent Progress Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-bold">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Campaign Command Center: {selectedCampaign?.name}</span>
              </div>
              <StatusBadge status={selectedCampaign?.status || 'Active'} />
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading campaign analytics and live agent progress...
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Campaign KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 shadow-none bg-muted/20 border">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase">Total Leads</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {selectedCampaign?.metrics?.total || campaignContacts.length}
                  </div>
                </Card>
                <Card className="p-3 shadow-none bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[11px] text-emerald-700 font-semibold uppercase">Completed Calls</span>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {selectedCampaign?.metrics?.completed || 0}
                  </div>
                </Card>
                <Card className="p-3 shadow-none bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[11px] text-blue-700 font-semibold uppercase">Answered / Reached</span>
                  <div className="text-xl font-bold text-blue-700 mt-1">
                    {selectedCampaign?.metrics?.answered || 0}
                  </div>
                </Card>
                <Card className="p-3 shadow-none bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[11px] text-amber-700 font-semibold uppercase">Pending in Queue</span>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {selectedCampaign?.metrics?.pending || 0}
                  </div>
                </Card>
              </div>

              {/* Agent Breakdown Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" /> Assigned Agents & Live Progress Breakdown
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Shows lead allocation and call outcomes per employee
                  </span>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Agent Name</th>
                        <th className="py-2.5 px-3 text-left">Role</th>
                        <th className="py-2.5 px-3 text-center">Assigned Leads</th>
                        <th className="py-2.5 px-3 text-center">Calls Made</th>
                        <th className="py-2.5 px-3 text-center">Interested</th>
                        <th className="py-2.5 px-3 text-center">Converted</th>
                        <th className="py-2.5 px-3 text-center">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agentProgress.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-muted-foreground">
                            No agent breakdown data recorded for this campaign yet.
                          </td>
                        </tr>
                      ) : (
                        agentProgress.map((ap) => (
                          <tr key={ap.user_id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 font-semibold text-foreground">{ap.agent_name}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px]">{ap.role_name}</Badge>
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{ap.assigned_leads}</td>
                            <td className="py-2 px-3 text-center text-emerald-600 font-semibold">{ap.calls_completed}</td>
                            <td className="py-2 px-3 text-center text-blue-600 font-semibold">{ap.interested_count}</td>
                            <td className="py-2 px-3 text-center text-indigo-600 font-bold">{ap.converted_count}</td>
                            <td className="py-2 px-3 text-center text-amber-600 font-medium">{ap.pending_calls}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Individual Contacts in Campaign */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Campaign Leads & Call Outcomes ({campaignContacts.length})
                </h4>

                <div className="rounded-xl border max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left">Lead Name</th>
                        <th className="py-2 px-3 text-left">Phone</th>
                        <th className="py-2 px-3 text-left">Assigned Agent</th>
                        <th className="py-2 px-3 text-center">Dial Status</th>
                        <th className="py-2 px-3 text-center">Lead Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {campaignContacts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted-foreground">
                            No contacts attached to this campaign.
                          </td>
                        </tr>
                      ) : (
                        campaignContacts.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/30">
                            <td className="py-1.5 px-3 font-medium text-foreground">
                              {c.first_name} {c.last_name || ''}
                            </td>
                            <td className="py-1.5 px-3 text-muted-foreground font-mono">{c.phone}</td>
                            <td className="py-1.5 px-3">
                              <span className="font-semibold text-primary">{c.assigned_agent_name || 'Unassigned'}</span>
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <StatusBadge status={c.lead_status || 'New'} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
