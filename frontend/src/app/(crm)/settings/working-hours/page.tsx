"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Save, Calendar } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function WorkingHoursSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_start_time: '09:30',
    business_end_time: '18:30',
    work_days: 'Mon-Sat',
    after_hours_ivr_message: 'Our offices are currently closed. Please leave a voicemail or call back during business hours (9:30 AM - 6:30 PM IST).',
    sla_count_business_hours_only: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'working_hours' } });
        if (res.data.success && res.data.data) {
          const map: Record<string, any> = {};
          res.data.data.forEach((s: any) => {
            if (s.value === 'true' || s.value === 'false') {
              map[s.key] = s.value === 'true';
            } else {
              map[s.key] = s.value;
            }
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
      const payload: Record<string, string> = {};
      Object.entries(formData).forEach(([k, v]) => {
        payload[k] = String(v);
      });

      const res = await api.put('/settings/working_hours', payload);
      if (res.data.success) {
        toast.success('Working hours configuration saved');
      }
    } catch {
      toast.error('Failed to save working hours');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Working Hours & SLA Calendar"
        subtitle="Operational shift hours (IST) used for telephony call routing, dialer availability, and SLA calculation"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'Working Hours' },
        ]}
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Shift & Calendar Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-time">Shift Start Time (IST)</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.business_start_time}
                  onChange={(e) => setFormData({ ...formData, business_start_time: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end-time">Shift End Time (IST)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.business_end_time}
                  onChange={(e) => setFormData({ ...formData, business_end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Active Work Days</Label>
              <Select
                value={formData.work_days}
                onValueChange={(val) => setFormData({ ...formData, work_days: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mon-Fri">Monday to Friday (5 Days)</SelectItem>
                  <SelectItem value="Mon-Sat">Monday to Saturday (6 Days - Standard)</SelectItem>
                  <SelectItem value="All-Week">All 7 Days (24x7 Support)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="after-hours">After-Hours Inbound Audio Prompt</Label>
              <Input
                id="after-hours"
                value={formData.after_hours_ivr_message}
                onChange={(e) => setFormData({ ...formData, after_hours_ivr_message: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Text converted to speech by IVR Solutions during non-working hours.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Pause SLA Clocks Outside Business Hours</Label>
                <p className="text-xs text-muted-foreground">Stops SLA countdown timer during nights and Sunday holidays</p>
              </div>
              <Switch
                checked={formData.sla_count_business_hours_only}
                onCheckedChange={(val) => setFormData({ ...formData, sla_count_business_hours_only: val })}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Working Hours'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

