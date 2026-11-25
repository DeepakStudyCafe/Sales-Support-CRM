"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PhoneCall, ShieldCheck, Copy, Check, Activity, Save, ExternalLink } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CallingSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [formData, setFormData] = useState({
    ivr_base_url: 'https://api.ivrsolutions.in',
    ivr_did_number: '01140005000',
    ivr_token: '••••••••••••••••',
    c2c_endpoint: '/api/c2c_get',
    record_all_calls: true,
    recording_retention_days: '180',
  });

  const webhookUrl = typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}/api/v1`}/calls/webhook`
    : 'https://crm.automationcafe.in/api/v1/calls/webhook';

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'calling' } });
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

  const handleTestConnection = async () => {
    setIsTesting(true);
    setHealthStatus(null);
    try {
      const res = await api.get('/calls/health');
      if (res.data.success) {
        setHealthStatus(res.data.data);
        if (res.data.data?.connected) {
          toast.success('Successfully connected to IVR Solutions gateway!');
        } else {
          toast.error(res.data.data?.message || 'IVR Gateway ping failed');
        }
      }
    } catch {
      toast.error('Could not reach backend telephony service');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success('Inbound webhook URL copied');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(formData).forEach(([k, v]) => {
        payload[k] = String(v);
      });

      const res = await api.put('/settings/calling', payload);
      if (res.data.success) {
        toast.success('Telephony and IVR settings saved');
      }
    } catch {
      toast.error('Failed to save calling settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Telephony & IVR Integration"
        subtitle="Configure IVR Solutions provider endpoints, virtual DIDs, Click-to-Call, and inbound webhooks"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'Calling Settings' },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="gap-2"
          >
            <Activity className="h-4 w-4 text-emerald-600" />
            {isTesting ? 'Pinging Gateway...' : 'Test IVR Gateway'}
          </Button>
        }
      />

      {healthStatus && (
        <div
          className={`p-4 rounded-lg border text-xs flex items-center justify-between ${
            healthStatus.connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>
              Gateway Status: <strong>{healthStatus.connected ? 'Online & Authenticated' : 'Disconnected'}</strong>{' '}
              ({healthStatus.message || 'OK'})
            </span>
          </div>
          <span className="font-mono">{healthStatus.endpoint || 'https://api.ivrsolutions.in'}</span>
        </div>
      )}

      {/* Gateway Params */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" /> IVR Solutions Telephony Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="base-url">IVR Solutions Base URL</Label>
                <Input
                  id="base-url"
                  value={formData.ivr_base_url}
                  onChange={(e) => setFormData({ ...formData, ivr_base_url: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="did">Primary Virtual DID / Caller ID</Label>
                <Input
                  id="did"
                  value={formData.ivr_did_number}
                  onChange={(e) => setFormData({ ...formData, ivr_did_number: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="token">IVR Solutions Secret Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={formData.ivr_token}
                  onChange={(e) => setFormData({ ...formData, ivr_token: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">Configured in `.env` (`IVR_TOKEN`).</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c2c">Click-to-Call Endpoint Route</Label>
                <Input
                  id="c2c"
                  value={formData.c2c_endpoint}
                  onChange={(e) => setFormData({ ...formData, c2c_endpoint: e.target.value })}
                />
              </div>
            </div>

            {/* Inbound Webhook Card */}
            <div className="p-4 rounded-lg bg-muted/40 border space-y-2">
              <Label className="text-xs font-semibold">Incoming IVR Solutions Webhook URL</Label>
              <p className="text-xs text-muted-foreground">
                Paste this destination URL inside your IVR Solutions portal under Inbound Webhook / Call Log Post:
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs bg-card" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhook}>
                  {copiedWebhook ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Automatic Call Recording</Label>
                <p className="text-xs text-muted-foreground">Instruct IVR Solutions to record all connected inbound & outbound conversations</p>
              </div>
              <Switch
                checked={formData.record_all_calls}
                onCheckedChange={(val) => setFormData({ ...formData, record_all_calls: val })}
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

