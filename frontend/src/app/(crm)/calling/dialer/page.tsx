"use client";

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PhoneCall, CheckCircle, Megaphone, ArrowRight } from 'lucide-react';
import { ProgressiveDialerWidget } from '@/components/calling/ProgressiveDialerWidget';
import Link from 'next/link';

export default function AutomaticDialerPage() {
  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <PageHeader
        title="Automated Progressive Dialer Console"
        subtitle="Automatic lead presentation, click-to-call dialing, post-call disposition logging, and paced queuing"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling' },
          { label: 'Automatic Dialer' },
        ]}
        actions={
          <Link href="/calling/campaigns">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <Megaphone className="h-3.5 w-3.5 text-primary" /> Manage Campaigns
            </Button>
          </Link>
        }
      />

      {/* Live Progressive Dial Queue Feed */}
      <ProgressiveDialerWidget />

      {/* System Telephony Protocol Card */}
      <Card className="shadow-xs border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" />
            Telephony & Calling Window Protocol
          </CardTitle>
          <CardDescription className="text-xs">
            Standard operating procedures for outbound call queues and agent extension bridging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>TRAI-compliant calling hours enforced (09:00 - 18:00 IST)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Round-robin & pooled lead distribution across assigned agents</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Real-time status updates sync directly to Lead & Opportunity pipelines</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Full call recordings and disposition audit trail logged per contact</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
