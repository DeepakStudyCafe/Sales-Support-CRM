"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import {
  Users,
  UserPlus,
  UserCheck,
  CheckCircle,
  XCircle,
  PhoneCall,
  PhoneMissed,
  Clock,
  AlertTriangle,
  Headphones,
  Calendar,
  Plus,
  FileSpreadsheet,
  PhoneForwarded,
  LifeBuoy,
  CalendarPlus,
  Download,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';
import { ExcelImportModal } from '@/components/shared/ExcelImportModal';
import { ExcelExportButton } from '@/components/shared/ExcelExportButton';
import { ProgressiveDialerWidget } from '@/components/calling/ProgressiveDialerWidget';
import { AgentLeadTrackingHub } from '@/components/dashboard/AgentLeadTrackingHub';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OverviewDashboardPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isQuickCallOpen, setIsQuickCallOpen] = useState(false);
  const [callDestination, setCallDestination] = useState('');
  const [callDid, setCallDid] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  const handleInitiateQuickCall = async () => {
    if (!callDestination) {
      toast.error('Please enter a destination phone number');
      return;
    }
    setIsCalling(true);
    try {
      await api.post('/calls/click-to-call', {
        destinationNumber: callDestination,
        didNumber: callDid || undefined,
      });
      toast.success(`Call initiated to ${callDestination}. Your extension will ring first.`);
      setIsQuickCallOpen(false);
      setCallDestination('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate telephony call');
    } finally {
      setIsCalling(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getTime() - Number(dateRange) * 24 * 60 * 60 * 1000);
      const res = await api.get('/dashboard/overview', {
        params: {
          dateFrom: from.toISOString(),
          dateTo: now.toISOString(),
        },
      });
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch {
      // Handled by global interceptor
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const leads = stats?.leads || {};
  const calls = stats?.calls || {};
  const followUps = stats?.followUps || {};
  const tickets = stats?.tickets || {};

  const leadDistribution = [
    { name: 'New', value: leads.new_leads || 0 },
    { name: 'Active', value: leads.active_leads || 0 },
    { name: 'Converted', value: leads.converted_leads || 0 },
    { name: 'Lost', value: leads.lost_leads || 0 },
  ].filter((item) => item.value > 0);

  const conversionRate = leads.total_leads
    ? Math.round(((leads.converted_leads || 0) / leads.total_leads) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'User'}`}
        subtitle={`Role: ${user?.roleName} • Enterprise overview and team performance metrics`}
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
              module="leads"
              label="Export Leads"
              variant="outline"
              size="sm"
            />

            <Link href="/leads/add">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Add Lead
              </Button>
            </Link>
          </div>
        }
      />

      {/* Enterprise Quick Action Bar */}
      <div className="rounded-2xl border bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Quick Action Center
            </h3>
            <p className="text-xs text-muted-foreground">Fast-track key enterprise sales and customer support workflows</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Link href="/leads/add" className="w-full">
            <Button variant="outline" className="w-full justify-start text-xs h-11 gap-2.5 font-medium border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-xs leading-none">Add Lead</p>
                <span className="text-[10px] text-muted-foreground">New Prospect</span>
              </div>
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={() => setIsQuickCallOpen(true)}
            className="w-full justify-start text-xs h-11 gap-2.5 font-medium border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <PhoneForwarded className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-xs leading-none">Click-to-Call</p>
              <span className="text-[10px] text-muted-foreground">Live IVR Dialer</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="w-full justify-start text-xs h-11 gap-2.5 font-medium border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-xs leading-none">Import Excel</p>
              <span className="text-[10px] text-muted-foreground">Bulk .xlsx upload</span>
            </div>
          </Button>

          <Link href="/tickets/create" className="w-full">
            <Button variant="outline" className="w-full justify-start text-xs h-11 gap-2.5 font-medium border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-xs leading-none">New Ticket</p>
                <span className="text-[10px] text-muted-foreground">Support & SLA</span>
              </div>
            </Button>
          </Link>

          <Link href="/follow-ups" className="w-full">
            <Button variant="outline" className="w-full justify-start text-xs h-11 gap-2.5 font-medium border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <CalendarPlus className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-xs leading-none">Schedule Task</p>
                <span className="text-[10px] text-muted-foreground">Reminders & Demos</span>
              </div>
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Progressive Dialer Lead Feed for Calling / Sales / Support Agents */}
      <ProgressiveDialerWidget className="mb-6" />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Leads"
          value={leads.total_leads ?? 0}
          icon={Users}
          iconColor="text-blue-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="New Leads"
          value={leads.new_leads ?? 0}
          icon={UserPlus}
          iconColor="text-sky-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Converted Leads"
          value={leads.converted_leads ?? 0}
          icon={CheckCircle}
          iconColor="text-emerald-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={UserCheck}
          iconColor="text-purple-600"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Customers"
          value={stats?.customers ?? 0}
          icon={UserCheck}
          iconColor="text-indigo-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="Answered Calls"
          value={calls.answered_calls ?? 0}
          icon={PhoneCall}
          iconColor="text-emerald-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Missed Calls"
          value={calls.missed_calls ?? 0}
          icon={PhoneMissed}
          iconColor="text-amber-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Open Tickets"
          value={tickets.open ?? 0}
          icon={Headphones}
          iconColor="text-rose-500"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Follow-ups Due Today"
          value={followUps.today_due ?? 0}
          icon={Clock}
          iconColor="text-amber-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="Overdue Tasks"
          value={followUps.overdue ?? 0}
          icon={AlertTriangle}
          iconColor="text-rose-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="Lost Leads"
          value={leads.lost_leads ?? 0}
          icon={XCircle}
          iconColor="text-zinc-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Resolved Tickets"
          value={tickets.resolved ?? 0}
          icon={CheckCircle}
          iconColor="text-teal-600"
          isLoading={isLoading}
        />
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Lead Acquisition Trend"
            description="Daily inbound leads recorded in system over time"
            isLoading={isLoading}
          >
            <div className="h-72 w-full">
              {stats?.leadTrend?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.leadTrend}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs text-muted-foreground"
                      tickLine={false}
                    />
                    <YAxis className="text-xs text-muted-foreground" tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Leads"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No trend data available for current date range
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Lead Status Distribution */}
        <ChartCard
          title="Lead Status Distribution"
          description="Breakdown by current sales stage"
          isLoading={isLoading}
        >
          <div className="h-72 w-full flex flex-col items-center justify-center">
            {leadDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={leadDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {leadDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">
                  {leadDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground font-medium">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No leads recorded yet</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Super Admin / Admin Executive Lead & Employee Status Hub */}
      <AgentLeadTrackingHub className="mb-6" />

      {/* Quick Action Shortcuts */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground mb-3">Quick Navigation</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/leads">
            <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Manage All Leads
            </Button>
          </Link>
          <Link href="/calling">
            <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
              <PhoneCall className="h-4 w-4 text-emerald-500" />
              Calling & IVR Hub
            </Button>
          </Link>
          <Link href="/follow-ups">
            <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Tasks & Follow-ups
            </Button>
          </Link>
          <Link href="/tickets">
            <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
              <Headphones className="h-4 w-4 text-purple-500" />
              Support Tickets Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        module="leads"
        onSuccess={() => {
          fetchDashboardData();
          toast.success('Leads imported! Dashboard metrics refreshed.');
        }}
      />

      {/* Quick Call Modal */}
      <Dialog open={isQuickCallOpen} onOpenChange={setIsQuickCallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-600" />
              Quick Click-to-Call Dialer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="quick-phone" className="text-xs">
                Destination Phone Number *
              </Label>
              <Input
                id="quick-phone"
                placeholder="e.g. +919876543210"
                value={callDestination}
                onChange={(e) => setCallDestination(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-did" className="text-xs">
                Caller ID / Outbound DID (Optional)
              </Label>
              <Input
                id="quick-did"
                placeholder="Leave blank to use default company DID"
                value={callDid}
                onChange={(e) => setCallDid(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              IVR Cloud bridge will connect your agent extension first, then dial the customer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsQuickCallOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              onClick={handleInitiateQuickCall}
              disabled={isCalling}
            >
              {isCalling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <PhoneCall className="h-3.5 w-3.5" />
                  Initiate Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

