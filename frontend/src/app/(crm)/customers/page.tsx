"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Customer } from '@/types/customer';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Phone, Eye, UserCheck } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Call modal
  const [callingCustomer, setCallingCustomer] = useState<any>(null);
  const [didNumber, setDidNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/customers', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery || undefined,
        },
      });
      if (res.data.success && res.data.data) {
        setCustomers(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleInitiateCall = async () => {
    if (!callingCustomer) return;
    setIsCalling(true);
    try {
      const res = await api.post('/calls/click-to-call', {
        customerPhone: callingCustomer.phone,
        did: didNumber || 'DEFAULT_DID',
        customerId: callingCustomer.id,
      });
      if (res.data.success) {
        toast.success('Call initiated via IVR Solutions');
        setCallingCustomer(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Call initiation failed');
    } finally {
      setIsCalling(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      sortable: true,
      render: (c) => (
        <div className="flex flex-col">
          <Link
            href={`/customers/${c.id}`}
            className="font-semibold text-primary hover:underline line-clamp-1"
          >
            {c.first_name} {c.last_name || ''}
          </Link>
          {c.company && (
            <span className="text-[11px] text-muted-foreground line-clamp-1">{c.company}</span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (c) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">{c.phone}</span>
          {c.email && <span className="text-muted-foreground text-[11px]">{c.email}</span>}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '-'}
        </span>
      ),
    },
    {
      key: 'assigned_to_name',
      header: 'Account Manager',
      render: (c) => (
        <span className="text-xs font-medium text-foreground">{c.assigned_to_name || 'Unassigned'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Customer Since',
      render: (c) => (
        <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => setCallingCustomer(c)}
            title="Click to Call"
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Link href={`/customers/${c.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="All Customers"
        subtitle="Customer database, Customer 360 profiles, converted leads and account management"
        breadcrumbs={[
          { label: 'Customers', href: '/customers' },
          { label: 'All Customers' },
        ]}
      />

      <DataTable
        columns={columns}
        data={customers}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        onSearch={(q) => {
          setSearchQuery(q);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search customer by name, phone, email or company..."
      />

      {/* Click-to-Call Modal */}
      <Dialog open={!!callingCustomer} onOpenChange={(open) => !open && setCallingCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              Call {callingCustomer?.first_name} {callingCustomer?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {callingCustomer?.first_name} {callingCustomer?.last_name}
              </p>
              <p className="text-muted-foreground">Destination: {callingCustomer?.phone}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custDid" className="text-xs">
                Caller DID Number
              </Label>
              <Input
                id="custDid"
                placeholder="Company DID (optional)"
                value={didNumber}
                onChange={(e) => setDidNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCallingCustomer(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              onClick={handleInitiateCall}
              isLoading={isCalling}
            >
              <Phone className="h-3.5 w-3.5" /> Call Customer Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

