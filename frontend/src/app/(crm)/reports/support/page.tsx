"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Headphones, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function SupportReportsPage() {
  const [data, setData] = useState<any>({ summary: {}, byAgent: [] });
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.get('/reports/support', { params: { dateFrom } });
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      toast.error('Failed to load support analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const summary = data.summary || {};
  const total = summary.total || 0;
  const open = summary.open || 0;
  const resolved = (summary.resolved || 0) + (summary.closed || 0);
  const avgHours = Math.round(summary.avg_resolution_hours || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Support & SLA Reports"
        subtitle="Ticket intake volume, resolution velocity, SLA adherence, and support team capacity"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/leads' },
          { label: 'Support Reports' },
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
              <Headphones className="h-4 w-4 text-primary" /> Tickets Raised
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" /> Open & In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Resolved Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {avgHours} <span className="text-xs font-normal text-muted-foreground">hours</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Agent Resolution Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Support Representative Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Support Agent</TableHead>
                <TableHead className="text-right">Assigned Tickets</TableHead>
                <TableHead className="text-right">Resolved</TableHead>
                <TableHead className="text-right">Resolution Rate</TableHead>
                <TableHead className="text-right">Avg Resolution Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byAgent?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    No support agent performance data recorded for this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.byAgent?.map((agent: any) => {
                  const rate = agent.assigned > 0 ? Math.round((agent.resolved / agent.assigned) * 100) : 0;
                  return (
                    <TableRow key={agent.agent || 'Unknown'}>
                      <TableCell className="font-semibold">{agent.agent || 'Unassigned'}</TableCell>
                      <TableCell className="text-right font-medium">{agent.assigned}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{agent.resolved}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{rate}%</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {Math.round(agent.avg_resolution_hours || 0)} hrs
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

