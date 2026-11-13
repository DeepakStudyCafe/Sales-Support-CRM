"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings,
  Building2,
  Clock,
  Bell,
  Mail,
  PhoneCall,
  Palette,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { toast } from 'sonner';

export default function SettingsHubPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'company' | 'working-hours' | 'notifications' | 'email' | 'telephony' | 'theme'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    app_name: 'Enterprise Sales & Customer Support CRM',
    company_name: 'CRM Enterprise Solutions Pvt Ltd',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    date_format: 'DD/MM/YYYY hh:mm A',
    lead_prefix: 'LEAD-',
    ticket_prefix: 'TICK-',
    contact_email: 'admin@crm.com',
    support_phone: '+91 1800-123-4567',
  });

  useEffect(() => {
    api.get('/settings', { params: { category: 'general' } }).then((res) => {
      if (res.data?.success && res.data?.data) {
        const map: Record<string, string> = {};
        res.data.data.forEach((s: any) => { map[s.key] = s.value; });
        setFormData((prev) => ({ ...prev, ...map }));
      }
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/general', formData);
      toast.success('System settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="System Settings Hub"
        subtitle="Configure organization profile, working hours, notification rules, IVR gateway and enterprise branding"
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'System Settings Hub' },
        ]}
      />

      {/* Sub-module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'general'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          General & System
        </button>

        <Link href="/settings/company">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Building2 className="h-3.5 w-3.5" />
            Company Profile
          </button>
        </Link>

        <Link href="/settings/working-hours">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Clock className="h-3.5 w-3.5" />
            Working Hours & SLA
          </button>
        </Link>

        <Link href="/settings/notifications">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Bell className="h-3.5 w-3.5" />
            Notification Preferences
          </button>
        </Link>

        <Link href="/settings/email">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Mail className="h-3.5 w-3.5" />
            Email & SMTP
          </button>
        </Link>

        <Link href="/settings/calling">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <PhoneCall className="h-3.5 w-3.5" />
            Telephony & IVR
          </button>
        </Link>

        <Link href="/settings/theme">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Palette className="h-3.5 w-3.5" />
            Theme & Appearance
          </button>
        </Link>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-600" />
              General System Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appName" className="text-xs font-semibold">Application Brand Name</Label>
                <Input
                  id="appName"
                  value={formData.app_name}
                  onChange={(e) => setFormData((p) => ({ ...p, app_name: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-xs font-semibold">Company / Entity Name</Label>
                <Input
                  id="companyName"
                  value={formData.company_name}
                  onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(val) => setFormData((p) => ({ ...p, timezone: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                    <SelectItem value="UTC">UTC (GMT)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Default Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(val) => setFormData((p) => ({ ...p, currency: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date Format</Label>
                <Select
                  value={formData.date_format}
                  onValueChange={(val) => setFormData((p) => ({ ...p, date_format: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY hh:mm A">DD/MM/YYYY hh:mm A</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail" className="text-xs font-semibold">Primary Contact / Admin Email</Label>
                <Input
                  id="contactEmail"
                  value={formData.contact_email}
                  onChange={(e) => setFormData((p) => ({ ...p, contact_email: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supportPhone" className="text-xs font-semibold">Toll-Free Support Line</Label>
                <Input
                  id="supportPhone"
                  value={formData.support_phone}
                  onChange={(e) => setFormData((p) => ({ ...p, support_phone: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isSaving} className="gap-2 text-xs font-semibold bg-primary">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

