"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Mail, ShieldAlert, Save } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function GlobalNotificationSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    global_email_alerts_enabled: true,
    notification_retention_days: '90',
    admin_alert_email: 'alerts@crm.com',
    ivr_down_alert: true,
    bulk_export_notification: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'global_notifications' } });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(settings).forEach(([k, v]) => {
        payload[k] = String(v);
      });

      const res = await api.put('/settings/global_notifications', payload);
      if (res.data.success) {
        toast.success('System notification settings saved');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Global Notification Settings"
        subtitle="Configure system-wide dispatch policies, alert retention, and administrative failure monitors"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'Notifications' },
        ]}
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Delivery & Audit Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="admin_email">Critical Administrative Alert Email</Label>
              <Input
                id="admin_email"
                type="email"
                value={settings.admin_alert_email}
                onChange={(e) => setSettings({ ...settings, admin_alert_email: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Receives infrastructure failure alerts and critical security warnings.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retention">In-App Notification Retention Period (Days)</Label>
              <Input
                id="retention"
                type="number"
                min="7"
                max="365"
                value={settings.notification_retention_days}
                onChange={(e) => setSettings({ ...settings, notification_retention_days: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Notifications older than this threshold will be pruned during maintenance.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Telephony / IVR Solutions Gateway Downtime Alert</Label>
                <p className="text-xs text-muted-foreground">Notify Admin immediately if IVR Solutions API returns non-200 or connection errors</p>
              </div>
              <Switch
                checked={settings.ivr_down_alert}
                onCheckedChange={(v) => setSettings({ ...settings, ivr_down_alert: v })}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Bulk Data Export Notification</Label>
                <p className="text-xs text-muted-foreground">Log security audit alert whenever an admin or sales user exports customer/lead CSV records</p>
              </div>
              <Switch
                checked={settings.bulk_export_notification}
                onCheckedChange={(v) => setSettings({ ...settings, bulk_export_notification: v })}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

