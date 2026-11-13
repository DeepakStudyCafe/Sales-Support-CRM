"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { Headphones, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SupportDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await api.get('/tickets/stats/support');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch {
        // Ignored
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Support Dashboard"
        subtitle="Customer helpdesk volume, resolution times, and SLA compliance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Support Dashboard' },
        ]}
        actions={
          <Link href="/tickets/create">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Create Ticket
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Assigned Tickets"
          value={stats?.total ?? 0}
          icon={Headphones}
          iconColor="text-blue-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="Open Tickets"
          value={stats?.open ?? 0}
          icon={Clock}
          iconColor="text-amber-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="In Progress"
          value={stats?.in_progress ?? 0}
          icon={Clock}
          iconColor="text-purple-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="SLA Breached / Overdue"
          value={stats?.overdue ?? 0}
          icon={AlertTriangle}
          iconColor="text-rose-600"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Resolved Volume"
          description="Tickets successfully closed and resolved"
          isLoading={isLoading}
        >
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-3">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">{stats?.resolved ?? 0}</h3>
            <p className="text-xs text-muted-foreground mt-1">Total tickets marked resolved</p>
          </div>
        </ChartCard>

        <ChartCard
          title="Helpdesk Quick Actions"
          description="Rapid navigation for customer support workflows"
        >
          <div className="flex flex-col gap-3 py-2">
            <Link href="/tickets">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>View All Tickets Queue</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/tickets/my">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>My Assigned Tickets</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/tickets/escalations">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>Escalated & SLA Breached Tickets</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/tickets/sla">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>SLA Configuration Matrix</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

