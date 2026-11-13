"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { leadService } from '@/services/lead.service';
import { Lead } from '@/types/lead';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Plus, Phone, Eye, Trash2, ArrowRightLeft, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/services/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick call modal
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [didNumber, setDidNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  // Convert modal
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await leadService.getLeads({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      });

      if (res.data.success && res.data.data) {
        setLeads(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch {
      toast.error('Failed to load leads list');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await leadService.deleteLead(deleteId);
      toast.success('Lead deleted successfully');
      setDeleteId(null);
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleInitiateCall = async () => {
    if (!callingLead) return;
    setIsCalling(true);
    try {
      const res = await api.post('/calls/click-to-call', {
        customerPhone: callingLead.phone,
        did: didNumber || 'DEFAULT_DID',
        leadId: callingLead.id,
      });
      if (res.data.success) {
        toast.success('Click-to-call initiated via IVR Solutions', {
          description: `Dialing customer ${callingLead.phone}`,
        });
        setCallingLead(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Call initiation failed. Verify IVR extension in settings.');
    } finally {
      setIsCalling(false);
    }
  };

  const handleConvertLead = async () => {
    if (!convertingLead) return;
    setIsConverting(true);
    try {
      const res = await api.patch(`/leads/${convertingLead.id}/convert`, {});
      if (res.data.success) {
        toast.success('Lead converted to Customer successfully!');
        setConvertingLead(null);
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to convert lead');
    } finally {
      setIsConverting(false);
    }
  };

  const columns: ColumnDef<Lead>[] = [
    {
      key: 'name',
      header: 'Lead Name',
      sortable: true,
      render: (lead) => (
        <div className="flex flex-col">
          <Link
            href={`/leads/${lead.id}`}
            className="font-semibold text-primary hover:underline line-clamp-1"
          >
            {lead.firstName} {lead.lastName}
          </Link>
          {lead.company && (
            <span className="text-[11px] text-muted-foreground line-clamp-1">{lead.company}</span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (lead) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">{lead.phone}</span>
          {lead.email && <span className="text-muted-foreground text-[11px]">{lead.email}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (lead) => <StatusBadge status={lead.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (lead) => <PriorityBadge priority={lead.priority} />,
    },
    {
      key: 'source',
      header: 'Source',
      render: (lead) => (
        <span className="text-xs text-muted-foreground">{lead.source?.name || (lead as any).source_name || '-'}</span>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (lead) => (
        <span className="text-xs font-medium text-foreground">
          {lead.assignedToUser?.fullName || (lead as any).assigned_to_name || (typeof lead.assignedTo === 'string' ? lead.assignedTo : 'Unassigned')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (lead) => (
        <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (lead) => (
        <div className="flex items-center gap-1.5">
          {/* Quick Click-to-Call */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => setCallingLead(lead)}
            title="Click to Call"
          >
            <Phone className="h-4 w-4" />
          </Button>

          {/* View Details */}
          <Link href={`/leads/${lead.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          {/* Convert to Customer */}
          {lead.status !== 'Converted' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              onClick={() => setConvertingLead(lead)}
              title="Convert to Customer"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}

          {/* Delete */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteId(lead.id)}
            title="Delete Lead"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="All Leads"
        subtitle="Manage prospective clients, lead qualification, phone calls and conversion history"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'All Leads' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/leads/pipeline">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Pipeline Board
              </Button>
            </Link>
            <Link href="/leads/add">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" /> Add Lead
              </Button>
            </Link>
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
        onSearch={(q) => {
          setSearchQuery(q);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search by name, phone, email or company..."
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        filterSlot={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(val) => {
                setPriorityFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Lead Record"
        description="Are you sure you want to delete this lead? This action is soft-deleted and can be recovered by an administrator."
        confirmLabel="Delete Lead"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Click-to-Call Modal */}
      <Dialog open={!!callingLead} onOpenChange={(open) => !open && setCallingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              Initiate Click-to-Call
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {callingLead?.firstName} {callingLead?.lastName}
              </p>
              <p className="text-muted-foreground">Destination Phone: {callingLead?.phone}</p>
              {callingLead?.company && <p className="text-muted-foreground">Company: {callingLead.company}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="did" className="text-xs">
                Caller ID / DID Number
              </Label>
              <Input
                id="did"
                placeholder="Enter approved company DID (or use assigned agent DID)"
                value={didNumber}
                onChange={(e) => setDidNumber(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Connecting via official IVR Solutions bridge API. Your extension phone will ring first.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCallingLead(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold gap-1.5"
              onClick={handleInitiateCall}
              isLoading={isCalling}
            >
              <Phone className="h-3.5 w-3.5" /> Call Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Customer Modal */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Convert Lead to Customer 360
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 text-sm">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Converting this lead will create an active Customer account, preserve all previous
              activity history, call records, and quotations, and mark the lead stage as Converted.
            </p>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {convertingLead?.firstName} {convertingLead?.lastName}
              </p>
              <p className="text-muted-foreground">Phone: {convertingLead?.phone}</p>
              <p className="text-muted-foreground">Email: {convertingLead?.email || 'N/A'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvertingLead(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={handleConvertLead}
              isLoading={isConverting}
            >
              Confirm & Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

