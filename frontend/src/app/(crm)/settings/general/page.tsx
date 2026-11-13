"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Globe } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function GeneralSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    app_name: 'Enterprise Sales & Customer Support CRM',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    date_format: 'DD/MM/YYYY hh:mm A',
    lead_prefix: 'LEAD-',
    ticket_prefix: 'TKT-',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'general' } });
        if (res.data.success && res.data.data) {
          const map: Record<string, string> = {};
          res.data.data.forEach((s: any) => {
            map[s.key] = s.value;
          });
          setFormData((prev) => ({ ...prev, ...map }));
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
      const res = await api.put('/settings/general', formData);
      if (res.data.success) {
        toast.success('General system settings updated');
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
        title="General Settings"
        subtitle="Global application configuration, regional localization, and entity numbering defaults"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'General' },
        ]}
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> System & Regional Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="app_name">Application Brand Name</Label>
              <Input
                id="app_name"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>System Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</SelectItem>
                    <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Standard operational timezone for follow-up reminders and call logs.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Currency Unit</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(val) => setFormData({ ...formData, currency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">Indian Rupee (₹ INR)</SelectItem>
                    <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                    <SelectItem value="EUR">Euro (€ EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="lead_prefix">Lead Sequence Identifier Prefix</Label>
                <Input
                  id="lead_prefix"
                  value={formData.lead_prefix}
                  onChange={(e) => setFormData({ ...formData, lead_prefix: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticket_prefix">Ticket Number Prefix</Label>
                <Input
                  id="ticket_prefix"
                  value={formData.ticket_prefix}
                  onChange={(e) => setFormData({ ...formData, ticket_prefix: e.target.value })}
                />
              </div>
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

