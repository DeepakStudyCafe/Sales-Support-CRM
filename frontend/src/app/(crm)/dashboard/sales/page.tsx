"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { Users, UserPlus, CheckCircle, Clock, AlertTriangle, PhoneCall, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SalesDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await api.get('/leads/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch {
        // Handled by global interceptor
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Sales Dashboard"
        subtitle="Individual and team sales pipeline, follow-ups, and conversion metrics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sales Dashboard' },
        ]}
        actions={
          <Link href="/leads/add">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add New Lead
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Assigned Leads"
          value={stats?.total ?? 0}
          icon={Users}
          iconColor="text-blue-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="New Leads"
          value={stats?.new ?? 0}
          icon={UserPlus}
          iconColor="text-sky-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="In Progress / Active"
          value={stats?.active ?? 0}
          icon={Clock}
          iconColor="text-amber-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Converted Customers"
          value={stats?.converted ?? 0}
          icon={CheckCircle}
          iconColor="text-emerald-600"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Pipeline Status Breakdown"
          description="Distribution of leads across sales stages"
          isLoading={isLoading}
        >
          <div className="space-y-3 py-2">
            {[
              { label: 'New', count: stats?.new ?? 0, color: 'bg-blue-500' },
              { label: 'In Progress / Follow-up', count: stats?.active ?? 0, color: 'bg-amber-500' },
              { label: 'Qualified Opportunities', count: stats?.qualified ?? 0, color: 'bg-purple-500' },
              { label: 'Converted Customers', count: stats?.converted ?? 0, color: 'bg-emerald-500' },
              { label: 'Lost', count: stats?.lost ?? 0, color: 'bg-rose-500' },
            ].map((stage) => {
              const total = stats?.total || 1;
              const percent = Math.round((stage.count / total) * 100);
              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{stage.label}</span>
                    <span className="text-muted-foreground">{stage.count} ({percent}%)</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Sales Actions"
          description="Direct shortcuts to core sales operations"
        >
          <div className="flex flex-col gap-3 py-2">
            <Link href="/leads/pipeline">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>View Visual Pipeline Board</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>Manage Opportunities & Deals</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/follow-ups/today">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>Execute Today's Follow-up Calls</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
            <Link href="/calling/click-to-call">
              <Button variant="outline" className="w-full justify-between h-11 text-xs">
                <span>Launch Direct Click-to-Call Dialer</span>
                <span className="text-muted-foreground">→</span>
              </Button>
            </Link>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

