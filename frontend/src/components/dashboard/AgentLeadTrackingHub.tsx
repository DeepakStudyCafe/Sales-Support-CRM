"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Users,
  Building,
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Sparkles,
  TrendingUp,
  Search,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface AgentLeadTrackingHubProps {
  className?: string;
}

export function AgentLeadTrackingHub({ className }: AgentLeadTrackingHubProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Reassign Modal
  const [reassignModalOpen, setReassignModalOpen] = useState<boolean>(false);
  const [activeLeadToReassign, setActiveLeadToReassign] = useState<any>(null);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Quick Call state
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);

  // Load active agents
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get('/users?limit=100&isActive=true');
        if (res.data.success && res.data.data) {
          setUsers(res.data.data);
        }
      } catch {
        // ignore
      }
    }
    fetchUsers();
  }, []);

  // Fetch leads based on selected user
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedUserId !== 'all') {
        params.assignedTo = selectedUserId;
      }
      const res = await api.get('/leads', { params });
      if (res.data.success && res.data.data) {
        setLeads(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle instant status change by Super Admin
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await api.put(`/leads/${leadId}`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Lead status updated to ${newStatus}`);
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update lead status');
    }
  };

  // Handle single lead reassign
  const handleExecuteReassign = async () => {
    if (!activeLeadToReassign || !targetAgentId) return;
    setIsReassigning(true);
    try {
      const res = await api.patch(`/leads/${activeLeadToReassign.id}/assign`, {
        assignedTo: targetAgentId,
        reason: 'Super Admin live reassignment from Executive Hub',
      });
      if (res.data.success) {
        toast.success(`Lead reassigned successfully`);
        setReassignModalOpen(false);
        setActiveLeadToReassign(null);
        setTargetAgentId('');
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reassign lead');
    } finally {
      setIsReassigning(false);
    }
  };

  // Quick call directly from table
  const handleQuickCall = async (lead: any) => {
    setCallingLeadId(lead.id);
    try {
      await api.post('/calls/click-to-call', {
        destinationNumber: lead.phone,
        leadId: lead.id,
      });
      toast.success(`Calling ${lead.first_name} (${lead.phone}). Connecting to extension...`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to connect telephony call');
    } finally {
      setCallingLeadId(null);
    }
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        searchQuery === '' ||
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phone && l.phone.includes(searchQuery)) ||
        (l.company && l.company.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Selected agent object
  const selectedAgentObj = users.find((u) => u.id === selectedUserId);

  // Compute metrics for the active view
  const metrics = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter((l) => l.status === 'Contacted' || l.status === 'Follow-up').length;
    const interested = leads.filter((l) => l.status === 'Interested' || l.status === 'Qualified').length;
    const converted = leads.filter((l) => l.status === 'Converted').length;
    const lost = leads.filter((l) => l.status === 'Lost').length;
    return { total, contacted, interested, converted, lost };
  }, [leads]);

  return (
    <div className={`space-y-4 rounded-2xl border bg-card p-5 shadow-xs ${className}`}>
      {/* Header and Employee Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Executive Employee Tracking & Lead Status Hub
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inspect all leads assigned to any Admin, Sales, or Support executive, review statuses, and reassign on the fly
          </p>
        </div>

        {/* User Picker */}
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-foreground whitespace-nowrap">Filter Employee:</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="h-9 text-xs w-56 font-medium">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">
                <span className="font-semibold text-primary">All Employees (Organization View)</span>
              </SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{u.first_name} {u.last_name}</span>
                    <span className="text-[10px] text-muted-foreground">({u.role_name || 'Agent'})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Stats for Selected User */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl border bg-muted/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Assigned</span>
          <p className="text-xl font-bold text-foreground mt-1">{metrics.total}</p>
        </div>
        <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Contacted / In Progress</span>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{metrics.contacted}</p>
        </div>
        <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Interested / Hot</span>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{metrics.interested}</p>
        </div>
        <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Converted Customers</span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.converted}</p>
        </div>
        <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/20 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Lost / Inactive</span>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">{metrics.lost}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Input
            placeholder="Search by customer name, phone, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
            <tr>
              <th className="py-2.5 px-3 text-left">Lead Contact</th>
              <th className="py-2.5 px-3 text-left">Company</th>
              <th className="py-2.5 px-3 text-left">Assigned Employee</th>
              <th className="py-2.5 px-3 text-center">Live Status</th>
              <th className="py-2.5 px-3 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading employee assigned leads...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  No leads found for this employee matching current filters.
                </td>
              </tr>
            ) : (
              filteredLeads.slice(0, 15).map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <Link href={`/leads/${l.id}`} className="font-bold text-primary hover:underline">
                        {l.first_name} {l.last_name || ''}
                      </Link>
                      <span className="text-[11px] text-muted-foreground font-mono">{l.phone}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{l.company || 'Direct Contact'}</td>
                  <td className="py-2.5 px-3">
                    {l.assigned_to_name ? (
                      <Badge variant="secondary" className="font-medium text-[11px]">
                        <UserCheck className="h-3 w-3 mr-1 text-primary" />
                        {l.assigned_to_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 font-semibold text-[10px]">
                        Unassigned
                      </Badge>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Select
                      value={l.status || 'New'}
                      onValueChange={(val) => handleUpdateStatus(l.id, val)}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-28 mx-auto font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Interested">Interested</SelectItem>
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Converted">Converted</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        title="Click to Call"
                        disabled={callingLeadId === l.id}
                        onClick={() => handleQuickCall(l)}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] gap-1 font-medium"
                        onClick={() => {
                          setActiveLeadToReassign(l);
                          setReassignModalOpen(true);
                        }}
                      >
                        <ArrowRightLeft className="h-3 w-3" /> Reassign
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredLeads.length > 15 && (
        <div className="text-center pt-2">
          <Link href={`/leads?${selectedUserId !== 'all' ? `assignedTo=${selectedUserId}` : ''}`}>
            <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold gap-1">
              View All {filteredLeads.length} Leads in Full Directory <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Reassign Lead Modal */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Reassign Lead: {activeLeadToReassign?.first_name} {activeLeadToReassign?.last_name || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <span className="text-muted-foreground block">Currently Assigned To:</span>
              <span className="font-bold text-foreground">
                {activeLeadToReassign?.assigned_to_name || 'Unassigned'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" required>
                Select Target Employee (Admin, Sales, or Support)
              </Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name || 'Agent'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteReassign}
              isLoading={isReassigning}
              className="font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

