"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PhoneCall, PhoneIncoming, PhoneMissed, Clock, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CallingReportsPage() {
  const [data, setData] = useState<any>({ summary: {}, byAgent: [], byOutcome: [] });
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.get('/reports/calling', { params: { dateFrom } });
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      toast.error('Failed to load telephony analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const summary = data.summary || {};
  const totalCalls = summary.total || 0;
  const answeredCalls = summary.answered || 0;
  const missedCalls = summary.missed || 0;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
  const avgDurationSec = Math.round(summary.avg_duration || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telephony & Call Analytics"
        subtitle="Call logs, connection ratios, IVR talk-time metrics, and agent calling activity"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/calling' },
          { label: 'Calling Reports' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Past Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchReports}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PhoneCall className="h-4 w-4 text-primary" /> Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PhoneIncoming className="h-4 w-4 text-emerald-600" /> Answered Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {answeredCalls} <span className="text-xs font-medium text-muted-foreground">({answerRate}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PhoneMissed className="h-4 w-4 text-red-500" /> Missed Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{missedCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {Math.floor(avgDurationSec / 60)}m {avgDurationSec % 60}s
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Call Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Agent Telephony Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Total Calls</TableHead>
                    <TableHead className="text-right">Answered</TableHead>
                    <TableHead className="text-right">Missed</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byAgent?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                        No agent calling records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byAgent?.map((agent: any) => (
                      <TableRow key={agent.agent || 'Unknown'}>
                        <TableCell className="font-semibold">{agent.agent || 'Unassigned'}</TableCell>
                        <TableCell className="text-right font-medium">{agent.total_calls}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-semibold">{agent.answered}</TableCell>
                        <TableCell className="text-right text-red-500">{agent.missed}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Math.round(agent.avg_duration || 0)}s
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Call Outcomes */}
        <div>
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Dispositions & Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {data.byOutcome?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No disposition tags logged yet.</p>
              ) : (
                data.byOutcome?.map((out: any) => (
                  <div key={out.outcome} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-foreground">{out.outcome}</span>
                    <span className="font-semibold bg-muted px-2 py-0.5 rounded">{out.count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

