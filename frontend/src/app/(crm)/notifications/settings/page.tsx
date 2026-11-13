"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Phone, Headphones, Save, Clock, ShieldAlert } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function NotificationSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_lead_assigned: true,
    email_ticket_assigned: true,
    email_sla_breach: true,
    inapp_followup_reminder: true,
    inapp_missed_call: true,
    inapp_ticket_reply: true,
    sound_enabled: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'notifications' } });
        if (res.data.success && res.data.data) {
          const map: Record<string, boolean> = {};
          res.data.data.forEach((s: any) => {
            map[s.key] = s.value === 'true';
          });
          setSettings((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // use defaults
      }
    }
    loadSettings();
  }, []);

  const handleToggle = (key: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(settings).forEach(([k, v]) => {
        payload[k] = String(v);
      });

      const res = await api.put('/settings/notifications', payload);
      if (res.data.success) {
        toast.success('Notification preferences updated');
      }
    } catch {
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Notification Settings"
        subtitle="Configure event triggers, delivery channels, and alert preferences"
        breadcrumbs={[
          { label: 'Notifications', href: '/notifications' },
          { label: 'Settings' },
        ]}
        actions={
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">New Lead Assignment</Label>
              <p className="text-xs text-muted-foreground">Receive an email when a new lead is assigned to you or your team</p>
            </div>
            <Switch
              checked={settings.email_lead_assigned}
              onCheckedChange={() => handleToggle('email_lead_assigned')}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Support Ticket Assignment</Label>
              <p className="text-xs text-muted-foreground">Receive an email when a support case is routed to your queue</p>
            </div>
            <Switch
              checked={settings.email_ticket_assigned}
              onCheckedChange={() => handleToggle('email_ticket_assigned')}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-red-600 dark:text-red-400">SLA Breach Warnings</Label>
              <p className="text-xs text-muted-foreground">Immediate escalation email when a high-priority ticket exceeds SLA resolution target</p>
            </div>
            <Switch
              checked={settings.email_sla_breach}
              onCheckedChange={() => handleToggle('email_sla_breach')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> In-App & Real-Time Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Follow-up Due Reminders</Label>
              <p className="text-xs text-muted-foreground">Display banner and notification sound 15 minutes before a scheduled call or meeting</p>
            </div>
            <Switch
              checked={settings.inapp_followup_reminder}
              onCheckedChange={() => handleToggle('inapp_followup_reminder')}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Missed Inbound Calls</Label>
              <p className="text-xs text-muted-foreground">Notify immediately when an incoming IVR customer call is unanswered</p>
            </div>
            <Switch
              checked={settings.inapp_missed_call}
              onCheckedChange={() => handleToggle('inapp_missed_call')}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Customer Ticket Replies</Label>
              <p className="text-xs text-muted-foreground">Alert when a customer posts a new response on an assigned ticket</p>
            </div>
            <Switch
              checked={settings.inapp_ticket_reply}
              onCheckedChange={() => handleToggle('inapp_ticket_reply')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

