"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Save, Shuffle, Users } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function AutoAssignmentPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    lead_auto_assign_enabled: true,
    lead_assignment_strategy: 'round_robin',
    ticket_auto_assign_enabled: true,
    ticket_assignment_strategy: 'workload',
    exclude_offline_agents: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'auto_assignment' } });
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

      const res = await api.put('/settings/auto_assignment', payload);
      if (res.data.success) {
        toast.success('Auto-assignment rules saved');
      }
    } catch {
      toast.error('Failed to save auto-assignment rules');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Auto-Assignment Rules"
        subtitle="Configure intelligent routing for incoming leads and support inquiries"
        breadcrumbs={[
          { label: 'Automation', href: '/automation/workflows' },
          { label: 'Auto Assignment' },
        ]}
        actions={
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-primary" /> Lead Assignment Routing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Automatic Lead Distribution</Label>
              <p className="text-xs text-muted-foreground">Automatically assign new website enquiries and imports</p>
            </div>
            <Switch
              checked={settings.lead_auto_assign_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, lead_auto_assign_enabled: v })}
            />
          </div>

          <div className="pt-2 border-t space-y-1.5">
            <Label>Distribution Algorithm</Label>
            <Select
              value={settings.lead_assignment_strategy}
              onValueChange={(v) => setSettings({ ...settings, lead_assignment_strategy: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">Round-Robin (Equal sequential distribution)</SelectItem>
                <SelectItem value="workload">Workload-based (Lowest active leads first)</SelectItem>
                <SelectItem value="performance">Conversion Rate (High performing agents first)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Support Ticket Routing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Automatic Support Case Assignment</Label>
              <p className="text-xs text-muted-foreground">Route newly submitted tickets to available support representatives</p>
            </div>
            <Switch
              checked={settings.ticket_auto_assign_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, ticket_auto_assign_enabled: v })}
            />
          </div>

          <div className="pt-2 border-t space-y-1.5">
            <Label>Support Queue Strategy</Label>
            <Select
              value={settings.ticket_assignment_strategy}
              onValueChange={(v) => setSettings({ ...settings, ticket_assignment_strategy: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workload">Workload Balance (Agent with least open tickets)</SelectItem>
                <SelectItem value="round_robin">Round-Robin Rotation</SelectItem>
                <SelectItem value="category_skill">Category Specialization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Exclude Offline Agents</Label>
              <p className="text-xs text-muted-foreground">Only distribute items to agents currently within active working hours</p>
            </div>
            <Switch
              checked={settings.exclude_offline_agents}
              onCheckedChange={(v) => setSettings({ ...settings, exclude_offline_agents: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

