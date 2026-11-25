"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import { Zap, Plus, Trash2, RefreshCw, Play, CheckCircle } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkflowsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleName === 'Super Admin';
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New rule state
  const [ruleName, setRuleName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('lead_created');
  const [actionType, setActionType] = useState('send_notification');
  const [actionTarget, setActionTarget] = useState('supervisor');

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/automation');
      if (res.data.success && res.data.data) {
        setRules(res.data.data);
      }
    } catch {
      toast.error('Failed to load automation workflows');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/automation', {
        name: ruleName.trim(),
        triggerEvent,
        actions: [{ type: actionType, params: { target: actionTarget } }],
        isActive: true,
      });

      if (res.data.success) {
        toast.success('Automation rule created');
        setIsDialogOpen(false);
        setRuleName('');
        fetchRules();
      }
    } catch {
      toast.error('Failed to create workflow rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await api.patch(`/automation/${id}/toggle`);
      if (res.data.success) {
        toast.success('Rule status updated');
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
        );
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow rule?')) return;
    try {
      const res = await api.delete(`/automation/${id}`);
      if (res.data.success) {
        toast.success('Rule deleted');
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const formatTriggerLabel = (event: string) => {
    switch (event) {
      case 'lead_created': return 'When new Lead is created';
      case 'lead_assigned': return 'When Lead is assigned';
      case 'lead_status_changed': return 'When Lead status changes';
      case 'call_completed': return 'When Call is finished';
      case 'followup_overdue': return 'When Follow-up becomes overdue';
      case 'ticket_created': return 'When Support Ticket is created';
      case 'ticket_sla_breached': return 'When Ticket SLA is breached';
      default: return event;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Automation"
        subtitle="Configure event-driven trigger rules, auto-routing, and instant notifications"
        breadcrumbs={[
          { label: 'Automation', href: '/automation/workflows' },
          { label: 'Workflows' },
        ]}
        actions={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Workflow Rule
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading workflows...
          </div>
        ) : rules.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card p-6">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-40 text-amber-500" />
            <p className="font-semibold text-foreground">No Workflow Rules Configured</p>
            <p className="text-sm">Click &quot;Add Workflow Rule&quot; to build event automations.</p>
          </div>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {rule.name}
                  </CardTitle>
                </div>
                <Switch
                  checked={!!rule.is_active}
                  onCheckedChange={() => handleToggle(rule.id)}
                />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="bg-muted/40 p-2.5 rounded text-xs space-y-1">
                  <p className="text-muted-foreground">Trigger:</p>
                  <p className="font-medium text-foreground">{formatTriggerLabel(rule.trigger_event)}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>Created {formatDate(rule.created_at)}</span>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(rule.id)}
                      title="Delete Rule (Super Admin Only)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Rule Name *</Label>
              <Input
                id="r-name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Notify Lead Supervisor on Urgent Ticket"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>When Event Happens (Trigger)</Label>
              <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_created">New Lead Created</SelectItem>
                  <SelectItem value="lead_assigned">Lead Assigned</SelectItem>
                  <SelectItem value="lead_status_changed">Lead Status Changed</SelectItem>
                  <SelectItem value="call_completed">Call Completed</SelectItem>
                  <SelectItem value="followup_overdue">Follow-up Overdue</SelectItem>
                  <SelectItem value="ticket_created">Support Ticket Created</SelectItem>
                  <SelectItem value="ticket_sla_breached">Ticket SLA Breached</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Execute Action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_notification">Send In-App & Email Notification</SelectItem>
                  <SelectItem value="assign_team">Route to Support Team Queue</SelectItem>
                  <SelectItem value="update_priority">Escalate Priority to High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !ruleName.trim()}>
                {isSubmitting ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

