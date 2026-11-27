"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Radio,
  ExternalLink,
  PhoneCall,
  Webhook,
  Layers,
  ShieldCheck,
  Headphones,
  Check,
  Copy,
  FileText,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function IVRSettingsPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = 'https://crm.automationcafe.in/api/v1/calls/webhook';

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await api.get('/calls/health');
      setHealthStatus(res.data.data);
    } catch {
      setHealthStatus({
        connected: false,
        message: 'Could not connect to backend telephony service',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setIsRegisteringWebhook(true);
    try {
      const res = await api.post('/calls/register-webhook', { webhookUrl });
      if (res.data?.success) {
        toast.success(res.data.message || 'Webhook successfully registered with IVR Solutions');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register webhook with IVR Solutions');
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleSyncLogs = async () => {
    setIsSyncingLogs(true);
    try {
      const res = await api.post('/calls/sync-logs');
      if (res.data?.success) {
        toast.success(res.data.message || 'Call logs & recordings synced from IVR Solutions');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to sync logs from IVR Solutions');
    } finally {
      setIsSyncingLogs(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success('Inbound webhook URL copied to clipboard');
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const endpointsList = [
    {
      name: 'Click-to-Call (C2C) Bridge',
      method: 'POST / GET',
      endpoint: '/api/c2c_post | /api/c2c_get',
      params: 'token, did, ext_no, phone, custom_id',
      purpose: 'Connects agent extension with customer phone number in real time.',
      status: 'Integrated',
    },
    {
      name: 'Call Detail Records (CDR) & Audio',
      method: 'POST / GET',
      endpoint: '/api/call_logs',
      params: 'token, from_date, to_date, phone, type',
      purpose: 'Fetches historical call duration, status (Answered/Missed), and audio recording URL.',
      status: 'Integrated',
    },
    {
      name: 'Click-to-Call History Logs',
      method: 'GET / POST',
      endpoint: '/api/ctc_logs',
      params: 'token, from_date, to_date, phone, ext_no',
      purpose: 'Tracks dedicated Click-to-Call agent interaction records and durations.',
      status: 'Integrated',
    },
    {
      name: 'Real-Time Inbound & Hangup Webhook',
      method: 'POST',
      endpoint: '/api/add_webhook_url',
      params: 'token, webhookurl, secret_key',
      purpose: 'Receives live call events, customer inbound calls, and recording URLs to our server.',
      status: 'Active',
    },
    {
      name: 'Auto-Dialer Campaign Controller',
      method: 'POST',
      endpoint: '/api/change_dialer_status',
      params: 'token, dialer_id, status (start | pause | stop)',
      purpose: 'Automates campaign calling: starts, pauses, or stops auto-dialer queues.',
      status: 'Integrated',
    },
    {
      name: 'Add Contacts to Dialer Queue',
      method: 'POST',
      endpoint: '/api/add_to_dialer',
      params: 'token, dialer_id, phones (comma-separated)',
      purpose: 'Pushes filtered leads and customer phone numbers into active campaign queues.',
      status: 'Integrated',
    },
    {
      name: 'Agent Live Telephony State',
      method: 'POST',
      endpoint: '/api/toggle_agent_status',
      params: 'token, agent_id, status (active | inactive)',
      purpose: 'Sets agent availability in the IVR queue for inbound distribution.',
      status: 'Integrated',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <PageHeader
        title="IVR Solutions Integration"
        subtitle="Official integration with https://api.ivrsolutions.in for Click-to-Call, CDR logs, audio recordings, and inbound webhooks"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'IVR Integration & Settings' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncLogs}
              disabled={isSyncingLogs}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingLogs ? 'animate-spin' : ''}`} />
              {isSyncingLogs ? 'Syncing...' : 'Sync Call Logs'}
            </Button>
            <Button
              size="sm"
              onClick={checkHealth}
              disabled={isChecking}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              Test API Connection
            </Button>
          </div>
        }
      />

      {/* Gateway Diagnostic Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Gateway Connectivity & Authentication
          </CardTitle>
          <CardDescription className="text-xs">
            Live diagnostic of CRM connection to <code>https://api.ivrsolutions.in</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-muted/20 gap-3">
            <div className="flex items-center gap-3">
              {healthStatus?.connected ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-amber-500 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {healthStatus?.connected ? 'IVR Solutions API Connected & Authenticated' : 'IVR API Credentials Pending or Unreachable'}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {healthStatus?.message || 'Set IVR_API_TOKEN in backend/.env to activate live bridge calling'}
                </p>
              </div>
            </div>

            <a
              href="https://ivrsolutions.in"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1 shrink-0"
            >
              IVR Solutions Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-card/60">
              <span className="text-muted-foreground block text-[11px]">API Base URL</span>
              <span className="font-mono font-semibold text-foreground mt-0.5 block truncate">
                https://api.ivrsolutions.in
              </span>
            </div>
            <div className="p-3 rounded-lg border bg-card/60">
              <span className="text-muted-foreground block text-[11px]">Default Virtual DID</span>
              <span className="font-mono font-semibold text-foreground mt-0.5 block">
                01140005000 (Configurable)
              </span>
            </div>
            <div className="p-3 rounded-lg border bg-card/60">
              <span className="text-muted-foreground block text-[11px]">Token Storage</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                backend/.env (IVR_API_TOKEN)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Webhook className="h-4 w-4 text-emerald-600" /> Inbound Call & CDR Webhook Sync
          </CardTitle>
          <CardDescription className="text-xs">
            Live callbacks push incoming calls, call completions, durations, and audio recordings automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Your Live Webhook Receiver URL:</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyWebhook}
                className="h-7 text-xs gap-1"
              >
                {copiedWebhook ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copiedWebhook ? 'Copied' : 'Copy URL'}
              </Button>
            </div>
            <code className="block p-2.5 rounded-lg bg-background border font-mono text-xs text-foreground select-all">
              {webhookUrl}
            </code>
            <p className="text-[11px] text-muted-foreground">
              Paste this URL in your IVR Solutions portal under <strong>Webhook Settings</strong>, or click the button below to register it automatically via API.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Automatic API Registration with <code>POST /api/add_webhook_url</code>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegisterWebhook}
              disabled={isRegisteringWebhook}
              className="h-8 gap-1.5 text-xs font-semibold text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <Webhook className="h-3.5 w-3.5" />
              {isRegisteringWebhook ? 'Registering...' : 'Register Webhook with IVR Solutions'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Directory Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" /> Integrated IVR Solutions API Endpoints
          </CardTitle>
          <CardDescription className="text-xs">
            All calling, dialer, and CDR endpoints actively integrated into this CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="p-3 font-semibold">Capability</th>
                  <th className="p-3 font-semibold">Method & Endpoint</th>
                  <th className="p-3 font-semibold">Payload Parameters</th>
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {endpointsList.map((ep, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                      {ep.name}
                    </td>
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-primary">
                      {ep.endpoint}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {ep.params}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ep.purpose}
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
                        {ep.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
