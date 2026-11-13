"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, RefreshCw, Radio, ExternalLink } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function IVRSettingsPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await api.get('/calls/health');
      setHealthStatus(res.data.data);
    } catch {
      setHealthStatus({ connected: false, message: 'Could not connect to backend IVR service' });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <PageHeader
        title="IVR Solutions Integration"
        subtitle="Manage official IVR Solutions telephony credentials, webhooks, and gateway status"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'IVR Settings' },
        ]}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={checkHealth}
            isLoading={isChecking}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Test Connection
          </Button>
        }
      />

      {/* Integration Health Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Service Connectivity Status
          </CardTitle>
          <CardDescription className="text-xs">
            Live diagnostic of backend integration with IVR Solutions endpoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
            <div className="flex items-center gap-3">
              {healthStatus?.connected ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-amber-500 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {healthStatus?.connected ? 'IVR API Connected & Ready' : 'IVR Account Credentials Pending'}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {healthStatus?.message || 'Update IVR_API_TOKEN in backend .env to activate live bridge calling'}
                </p>
              </div>
            </div>
            <a
              href="https://ivrsolutions.in"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Provider Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="border-t pt-4 space-y-4 text-xs">
            <h4 className="font-semibold text-foreground">Backend Telephony Environment Variables</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
              <div className="p-3 rounded-lg border bg-card/60">
                <span className="font-mono text-foreground font-semibold">IVR_API_BASE_URL</span>
                <p className="mt-1">https://api.ivrsolutions.in</p>
              </div>
              <div className="p-3 rounded-lg border bg-card/60">
                <span className="font-mono text-foreground font-semibold">IVR_API_TOKEN</span>
                <p className="mt-1">Set securely in backend/.env</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
              <h5 className="font-semibold text-foreground text-xs">Inbound Webhook Sync Endpoint</h5>
              <p className="text-muted-foreground text-[11px]">
                Configure this URL in your IVR Solutions portal under Webhook / Event notifications:
              </p>
              <code className="block p-2 rounded bg-background border font-mono text-xs text-foreground select-all mt-1">
                http://your-server-domain:5000/api/v1/calls/webhook
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

