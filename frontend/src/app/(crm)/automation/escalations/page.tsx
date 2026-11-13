"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Save, ShieldAlert, ArrowUpRight } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function EscalationRulesPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    sla_warning_threshold_pct: '80',
    notify_supervisor_on_breach: true,
    auto_reassign_breached_tickets: false,
    unassigned_lead_timeout_hours: '2',
    escalate_lost_high_value_leads: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'escalation_rules' } });
        if (res.data.success && res.data.data) {
          const map: Record<string, any> = {};
          res.data.data.forEach((s: any) => {
            if (s.value === 'true' || s.value === 'false') {
              map[s.key] = s.value === 'true';
            } else {
              map[s.key] = s.value;
            }
          });
          setSettings((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // use defaults
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(settings).forEach(([k, v]) => {
        payload[k] = String(v);
      });

      const res = await api.put('/settings/escalation_rules', payload);
      if (res.data.success) {
        toast.success('Escalation rules saved');
      }
    } catch {
      toast.error('Failed to save escalation rules');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Escalation Rules & Protocols"
        subtitle="Manage automated supervisory escalation pathways for SLA violations and unhandled leads"
        breadcrumbs={[
          { label: 'Automation', href: '/automation/workflows' },
          { label: 'Escalation Rules' },
        ]}
        actions={
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Protocols'}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" /> Support Ticket SLA Escalations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Proactive Early Warning Alert</Label>
            <Select
              value={settings.sla_warning_threshold_pct}
              onValueChange={(v) => setSettings({ ...settings, sla_warning_threshold_pct: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="70">At 70% of SLA time elapsed</SelectItem>
                <SelectItem value="80">At 80% of SLA time elapsed (Recommended)</SelectItem>
                <SelectItem value="90">At 90% of SLA time elapsed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Alerts the assigned support agent before SLA breach occurs.</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Supervisor Breach Notification</Label>
              <p className="text-xs text-muted-foreground">Directly notify Admin and Support Leads when a ticket breaches SLA deadline</p>
            </div>
            <Switch
              checked={settings.notify_supervisor_on_breach}
              onCheckedChange={(v) => setSettings({ ...settings, notify_supervisor_on_breach: v })}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto-Reassign on Breach</Label>
              <p className="text-xs text-muted-foreground">Re-route breached tickets to Tier 2 support team queue automatically</p>
            </div>
            <Switch
              checked={settings.auto_reassign_breached_tickets}
              onCheckedChange={(v) => setSettings({ ...settings, auto_reassign_breached_tickets: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-primary" /> Sales Lead Escalations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Uncontacted New Lead Threshold</Label>
            <Select
              value={settings.unassigned_lead_timeout_hours}
              onValueChange={(v) => setSettings({ ...settings, unassigned_lead_timeout_hours: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour without action</SelectItem>
                <SelectItem value="2">2 Hours without action (Standard)</SelectItem>
                <SelectItem value="4">4 Hours without action</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Re-assigns high-intent leads if assigned agent has not initiated a call or note.</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">High Value Opportunity Loss Escalation</Label>
              <p className="text-xs text-muted-foreground">Alert sales management when an opportunity over ₹1,00,000 is marked Lost</p>
            </div>
            <Switch
              checked={settings.escalate_lost_high_value_leads}
              onCheckedChange={(v) => setSettings({ ...settings, escalate_lost_high_value_leads: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

