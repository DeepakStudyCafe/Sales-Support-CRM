"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  Briefcase,
  Headphones,
  CheckCircle,
  Plus,
  ArrowLeft,
  Volume2,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Call modal
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [didNumber, setDidNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      if (res.data.success && res.data.data) {
        setCustomer(res.data.data);
      }
    } catch {
      toast.error('Failed to load customer profile');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleInitiateCall = async () => {
    setIsCalling(true);
    try {
      const res = await api.post('/calls/click-to-call', {
        customerPhone: customer.phone,
        did: didNumber || 'DEFAULT_DID',
        customerId: customer.id,
      });
      if (res.data.success) {
        toast.success('Call initiated via IVR Solutions');
        setCallModalOpen(false);
        fetchCustomer();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Call initiation failed');
    } finally {
      setIsCalling(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading Customer 360 profile..." />;
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Customer record not found</h3>
        <Link href="/customers">
          <Button variant="outline" className="mt-4">
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const calls = customer.calls || [];
  const tickets = customer.tickets || [];
  const followUps = customer.followUps || [];
  const opportunities = customer.opportunities || [];

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      <PageHeader
        title={`${customer.first_name} ${customer.last_name || ''}`}
        subtitle={`Customer 360 Profile • Account Manager: ${customer.assigned_to_name || 'Unassigned'}`}
        breadcrumbs={[
          { label: 'Customers', href: '/customers' },
          { label: `${customer.first_name} ${customer.last_name || ''}` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/customers">
              <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 h-9 gap-1.5 text-xs font-semibold"
              onClick={() => setCallModalOpen(true)}
            >
              <Phone className="h-3.5 w-3.5" /> Click to Call
            </Button>
            <Link href={`/tickets/create?customerId=${customer.id}`}>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
                <Headphones className="h-3.5 w-3.5" /> Open Ticket
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Profile Card */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Account Overview</CardTitle>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" /> Active Customer
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground">{customer.phone}</span>
                </div>
                {customer.alt_phone && (
                  <div className="flex items-center gap-2 pl-5 text-muted-foreground">
                    Alt: {customer.alt_phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.company && (
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">{customer.company}</span>
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      {customer.address && `${customer.address}, `}
                      {customer.city} {customer.state ? `, ${customer.state}` : ''}
                      {customer.pincode ? ` - ${customer.pincode}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead Conversion:</span>
                  <span className="font-medium text-foreground">
                    {customer.lead_source_name ? `From ${customer.lead_source_name}` : 'Direct'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Created:</span>
                  <span className="text-muted-foreground">{formatDate(customer.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interaction History Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="calls" className="w-full">
            <TabsList className="w-full justify-start rounded-xl border bg-muted/50 p-1">
              <TabsTrigger value="calls" className="text-xs">
                Calls ({calls.length})
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="text-xs">
                Deals ({opportunities.length})
              </TabsTrigger>
              <TabsTrigger value="tickets" className="text-xs">
                Tickets ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                Follow-ups ({followUps.length})
              </TabsTrigger>
            </TabsList>

            {/* Calls Tab */}
            <TabsContent value="calls" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Telephony & Call Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {calls.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No calls recorded for this customer yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {calls.map((c: any) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold capitalize text-foreground">
                              {c.direction} Call • {c.status}
                            </span>
                            <span className="text-muted-foreground mt-0.5">
                              Agent: {c.agent_name || 'System'} • Duration: {c.duration || 0}s
                            </span>
                            {c.outcome && (
                              <span className="text-primary font-medium mt-1">
                                Disposition: {c.outcome}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-muted-foreground">{formatDate(c.initiated_at)}</span>
                            {c.recording_url && (
                              <a
                                href={c.recording_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                              >
                                <Volume2 className="h-3 w-3" /> Audio Recording
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Opportunities Tab */}
            <TabsContent value="opportunities" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Sales Opportunities & Deals</CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunities.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No opportunities logged
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {opportunities.map((o: any) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{o.title}</span>
                            <p className="text-muted-foreground mt-0.5">
                              Value: {formatCurrency(o.value, o.currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={o.stage} />
                            <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Customer Support Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  {tickets.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No support tickets logged
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((t: any) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div>
                            <Link
                              href={`/tickets/${t.id}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              [{t.ticket_number}] {t.title}
                            </Link>
                            <p className="text-muted-foreground mt-0.5">
                              Created: {formatDate(t.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <PriorityBadge priority={t.priority} />
                            <StatusBadge status={t.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Follow-ups Tab */}
            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Scheduled Follow-ups & Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {followUps.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No follow-ups scheduled
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {followUps.map((f: any) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{f.title}</span>
                            <p className="text-muted-foreground mt-0.5">
                              Due: {formatDate(f.scheduled_at)}
                            </p>
                          </div>
                          <StatusBadge status={f.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Click to Call Dialog */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              Call {customer.first_name} {customer.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{customer.first_name} {customer.last_name}</p>
              <p className="text-muted-foreground">Destination: {customer.phone}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custDid2" className="text-xs">
                Caller DID Number
              </Label>
              <Input
                id="custDid2"
                placeholder="Company DID (optional)"
                value={didNumber}
                onChange={(e) => setDidNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCallModalOpen(false)}>
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

