"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Clock, ShieldCheck, Edit2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function SlaManagementPage() {
  const [slaList, setSlaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSla, setEditingSla] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [firstResponseHours, setFirstResponseHours] = useState('');
  const [resolutionHours, setResolutionHours] = useState('');
  const [workingHoursOnly, setWorkingHoursOnly] = useState(true);

  const fetchSla = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets/sla/all');
      if (res.data.success && res.data.data) {
        setSlaList(res.data.data);
      }
    } catch {
      toast.error('Failed to load SLA policies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSla();
  }, []);

  const openEditModal = (sla: any) => {
    setEditingSla(sla);
    setFirstResponseHours(String(sla.first_response_hours));
    setResolutionHours(String(sla.resolution_hours));
    setWorkingHoursOnly(!!sla.working_hours_only);
  };

  const handleUpdateSla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSla) return;

    setIsSubmitting(true);
    try {
      const res = await api.put(`/tickets/sla/${editingSla.id}`, {
        firstResponseHours: parseFloat(firstResponseHours),
        resolutionHours: parseFloat(resolutionHours),
        workingHoursOnly,
      });

      if (res.data.success) {
        toast.success(`SLA for ${editingSla.priority} updated`);
        setEditingSla(null);
        fetchSla();
      }
    } catch {
      toast.error('Failed to update SLA configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Level Agreements (SLA)"
        subtitle="Configure first-response and resolution time targets for customer tickets by priority level"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'SLA Management' },
        ]}
      />

      <div className="rounded-lg border bg-amber-500/10 border-amber-500/20 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">How SLA Timers Work: </span>
          When a customer ticket is created, the system calculates deadlines based on priority. If an agent does not respond or resolve within these targets, the ticket triggers SLA breach notifications and auto-escalations.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading SLA configurations...
          </div>
        ) : slaList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No SLA configurations found.
          </div>
        ) : (
          slaList.map((sla) => (
            <Card key={sla.id} className="relative">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">{sla.name || `${sla.priority} SLA`}</CardTitle>
                </div>
                <PriorityBadge priority={sla.priority} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg text-center">
                  <div className="border-r border-border">
                    <p className="text-xs text-muted-foreground">First Response</p>
                    <p className="text-lg font-bold text-foreground">
                      {sla.first_response_hours} <span className="text-xs font-normal text-muted-foreground">hrs</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resolution Target</p>
                    <p className="text-lg font-bold text-foreground">
                      {sla.resolution_hours} <span className="text-xs font-normal text-muted-foreground">hrs</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Working Hours Only:</span>
                  <span className="font-medium text-foreground">{sla.working_hours_only ? 'Yes (9:30 - 18:30)' : '24x7 Calendar'}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => openEditModal(sla)}
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Targets
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit SLA Dialog */}
      <Dialog open={!!editingSla} onOpenChange={(open) => !open && setEditingSla(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SLA Policy: {editingSla?.priority}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSla} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="first-response">First Response Target (Hours) *</Label>
              <Input
                id="first-response"
                type="number"
                step="0.1"
                min="0.1"
                value={firstResponseHours}
                onChange={(e) => setFirstResponseHours(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">E.g. 0.5 for 30 minutes, 2 for 2 hours</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resolution-target">Resolution Target (Hours) *</Label>
              <Input
                id="resolution-target"
                type="number"
                step="0.5"
                min="0.5"
                value={resolutionHours}
                onChange={(e) => setResolutionHours(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">E.g. 4 for 4 hours, 24 for 1 business day</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="working-hours" className="cursor-pointer">
                Calculate during business working hours only
              </Label>
              <Switch
                id="working-hours"
                checked={workingHoursOnly}
                onCheckedChange={setWorkingHoursOnly}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingSla(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Targets'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

