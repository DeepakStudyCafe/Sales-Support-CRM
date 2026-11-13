"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Save, BellRing, Calendar } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function ReminderRulesPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    followup_lead_time_minutes: '15',
    daily_morning_digest: true,
    overdue_task_alerts: true,
    inactive_lead_reminder_days: '7',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'reminders' } });
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

      const res = await api.put('/settings/reminders', payload);
      if (res.data.success) {
        toast.success('Reminder rules saved');
      }
    } catch {
      toast.error('Failed to save reminder rules');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Reminder Rules"
        subtitle="Automated alerts and scheduled prompts for sales follow-ups and customer commitments"
        breadcrumbs={[
          { label: 'Automation', href: '/automation/workflows' },
          { label: 'Reminder Rules' },
        ]}
        actions={
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Follow-up Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Advance Reminder Window</Label>
            <Select
              value={settings.followup_lead_time_minutes}
              onValueChange={(v) => setSettings({ ...settings, followup_lead_time_minutes: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before (Recommended)</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Notification alert sent to the assigned agent before the scheduled task time.</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Daily 9:30 AM IST Briefing</Label>
              <p className="text-xs text-muted-foreground">Send a summary of tasks and follow-ups scheduled for the day to each employee</p>
            </div>
            <Switch
              checked={settings.daily_morning_digest}
              onCheckedChange={(v) => setSettings({ ...settings, daily_morning_digest: v })}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Overdue Escalation Warning</Label>
              <p className="text-xs text-muted-foreground">Notify agent and supervisor when a scheduled follow-up has passed without completion</p>
            </div>
            <Switch
              checked={settings.overdue_task_alerts}
              onCheckedChange={(v) => setSettings({ ...settings, overdue_task_alerts: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Stale Lead Re-engagement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Inactivity Threshold</Label>
            <Select
              value={settings.inactive_lead_reminder_days}
              onValueChange={(v) => setSettings({ ...settings, inactive_lead_reminder_days: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Days without interaction</SelectItem>
                <SelectItem value="7">7 Days without interaction</SelectItem>
                <SelectItem value="14">14 Days without interaction</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Alerts the assigned sales representative to follow up or requalify the lead.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

