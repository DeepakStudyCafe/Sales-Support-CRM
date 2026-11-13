"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Filter, RefreshCw, Award } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function LeadReportsPage() {
  const [data, setData] = useState<any>({ byStatus: [], bySource: [], byAgent: [] });
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.get('/reports/leads', { params: { dateFrom } });
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      toast.error('Failed to load lead analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const totalLeads = data.byStatus?.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Analytics & Conversion Reports"
        subtitle="Distribution of incoming leads by pipeline stage, channel source, and representative performance"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/leads' },
          { label: 'Lead Reports' },
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Ingested Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.bySource?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Assigned Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.byAgent?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Leads by Status</span>
              <span className="text-xs font-normal text-muted-foreground">{totalLeads} leads total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {data.byStatus?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No leads recorded in this period.</p>
            ) : (
              data.byStatus?.map((item: any) => {
                const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{item.status}</span>
                      <span>{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Leads by Inbound Source</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {data.bySource?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No sources available.</p>
            ) : (
              data.bySource?.map((item: any) => {
                const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
                return (
                  <div key={item.source || 'Direct'} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{item.source || 'Direct / Unknown'}</span>
                      <span>{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Sales Agent Conversion Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byAgent?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    No agent conversion data for this time period.
                  </TableCell>
                </TableRow>
              ) : (
                data.byAgent?.map((agent: any) => {
                  const rate = agent.total > 0 ? Math.round((agent.converted / agent.total) * 100) : 0;
                  return (
                    <TableRow key={agent.agent || 'Unknown'}>
                      <TableCell className="font-semibold">{agent.agent || 'Unassigned'}</TableCell>
                      <TableCell className="text-right">{agent.total}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{agent.converted}</TableCell>
                      <TableCell className="text-right text-red-500">{agent.lost}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{rate}%</TableCell>
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

