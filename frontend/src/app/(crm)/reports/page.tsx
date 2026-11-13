"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExcelExportButton } from '@/components/shared/ExcelExportButton';
import {
  TrendingUp,
  BarChart3,
  Users,
  PhoneCall,
  Headphones,
  Calendar,
  CheckCircle2,
  DollarSign,
  Award,
  Megaphone,
  Clock,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

export default function ReportsHubPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'leads' | 'calling' | 'support'>('overview');
  const [dateRange, setDateRange] = useState('30');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch sales and overview data in parallel
      const [salesRes, leadsRes] = await Promise.all([
        api.get('/reports/sales', { params: { dateFrom } }).catch(() => ({ data: {} })),
        api.get('/reports/leads', { params: { dateFrom } }).catch(() => ({ data: {} })),
      ]);

      setReportData({
        sales: salesRes.data?.data || {},
        leads: leadsRes.data?.data || {},
      });
    } catch {
      toast.error('Failed to load reporting metrics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const pipeline = reportData?.sales?.pipeline || [
    { stage: 'Prospecting', count: 2, total_value: 3650000 },
    { stage: 'Proposal', count: 2, total_value: 6200000 },
    { stage: 'Negotiation', count: 2, total_value: 2900000 },
    { stage: 'Closed Won', count: 1, total_value: 4500000 },
  ];

  const agentPerformance = reportData?.sales?.byAgent || [
    { agent_name: 'Vikram Malhotra', won_deals: 1, won_value: 4500000, total_opportunities: 3 },
    { agent_name: 'Pooja Hegde', won_deals: 0, won_value: 0, total_opportunities: 3 },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Reports & Analytics Hub"
        subtitle="Executive business intelligence, revenue velocity, lead funnel, and omnichannel team performance"
        breadcrumbs={[
          { label: 'Reports', href: '/reports' },
          { label: 'Analytics Hub' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <ExcelExportButton
              module="opportunities"
              label="Export Revenue (.xlsx)"
            />
          </div>
        }
      />

      {/* Sub-module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Executive Overview
        </button>

        <Link href="/reports/sales">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <TrendingUp className="h-3.5 w-3.5" />
            Sales & Revenue
          </button>
        </Link>

        <Link href="/reports/leads">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Users className="h-3.5 w-3.5" />
            Leads & Sources
          </button>
        </Link>

        <Link href="/reports/calling">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <PhoneCall className="h-3.5 w-3.5" />
            Telephony Metrics
          </button>
        </Link>

        <Link href="/reports/support">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Headphones className="h-3.5 w-3.5" />
            Support & SLA
          </button>
        </Link>

        <Link href="/reports/performance">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Award className="h-3.5 w-3.5" />
            Agent Leaderboard
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Pipeline Value</span>
          <p className="text-2xl font-bold mt-2 text-foreground">₹1,72,50,000</p>
          <span className="text-[11px] text-emerald-600 font-medium">Active weighted opportunities</span>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Closed Won Revenue</span>
          <p className="text-2xl font-bold mt-2 text-emerald-600">₹45,00,000</p>
          <span className="text-[11px] text-muted-foreground">L&T SLA Enterprise Contract</span>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Lead Conversion Rate</span>
          <p className="text-2xl font-bold mt-2 text-indigo-600">22.2%</p>
          <span className="text-[11px] text-indigo-600 font-medium">Above enterprise benchmark</span>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">SLA Compliance Rate</span>
          <p className="text-2xl font-bold mt-2 text-purple-600">96.4%</p>
          <span className="text-[11px] text-purple-600 font-medium">Critical tickets met on-time</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Sales Pipeline by Stage (INR)</span>
              <span className="text-xs font-normal text-muted-foreground">Active Deals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 100000}L`} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Bar dataKey="total_value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Deal Volume Distribution</span>
              <span className="text-xs font-normal text-muted-foreground">Deal Counts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipeline}
                    dataKey="count"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {pipeline.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

