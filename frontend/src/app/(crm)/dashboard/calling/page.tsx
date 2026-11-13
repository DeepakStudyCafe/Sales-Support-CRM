"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { PhoneCall, PhoneMissed, PhoneIncoming, Clock, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function CallingDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await api.get('/reports/calling');
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch {
        // Ignored
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const summary = data?.summary || {};

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Calling Dashboard"
        subtitle="Telephony operations, dialer campaign execution, and IVR statistics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Calling Dashboard' },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/calling/click-to-call">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                <PhoneCall className="h-3.5 w-3.5" /> Click-to-Call
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Calls Initiated"
          value={summary.total ?? 0}
          icon={PhoneCall}
          iconColor="text-blue-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="Answered & Connected"
          value={summary.answered ?? 0}
          icon={PhoneIncoming}
          iconColor="text-emerald-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Missed Calls"
          value={summary.missed ?? 0}
          icon={PhoneMissed}
          iconColor="text-amber-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg Call Duration"
          value={`${Math.round(summary.avg_duration ?? 0)} sec`}
          icon={Clock}
          iconColor="text-purple-600"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Call Outcome Dispositions"
          description="Outcomes selected by sales/support representatives post-call"
          isLoading={isLoading}
        >
          <div className="space-y-3 py-2">
            {data?.byOutcome?.length ? (
              data.byOutcome.map((item: any) => (
                <div key={item.outcome} className="flex justify-between items-center text-xs py-1 border-b border-border/50">
                  <span className="font-medium text-foreground">{item.outcome}</span>
                  <span className="font-semibold text-primary">{item.count} calls</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No call outcomes logged yet</p>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Calling Operations"
          description="Quick access to telephony controls and logs"
        >
          <div className="flex flex-col gap-3 py-2">
            <Link href="/calling/history">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>View Real-time Call Logs</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/calling/campaigns">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>Manage Auto Dialer Campaigns</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/calling/ivr-settings">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>IVR Solutions Connection & DIDs</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/calling/recordings">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>Call Audio Recordings Archive</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

