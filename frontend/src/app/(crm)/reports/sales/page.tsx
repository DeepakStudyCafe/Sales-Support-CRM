"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, RefreshCw, IndianRupee, Target, Award } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function SalesReportsPage() {
  const [data, setData] = useState<any>({ pipeline: [], byAgent: [] });
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.get('/reports/sales', { params: { dateFrom } });
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      toast.error('Failed to load sales analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const totalWonValue = data.byAgent?.reduce((acc: number, item: any) => acc + (item.won_value || 0), 0) || 0;
  const totalOpportunities = data.pipeline?.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 0;
  const wonDealsCount = data.byAgent?.reduce((acc: number, item: any) => acc + (item.won || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Revenue Reports"
        subtitle="Opportunity pipeline velocity, deal values, and revenue breakdown by sales representative"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/sales' },
          { label: 'Sales Reports' },
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4 text-emerald-600" /> Total Won Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalWonValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" /> Active Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpportunities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Award className="h-4 w-4 text-primary" /> Closed Won Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{wonDealsCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Breakdown */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Opportunity Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {data.pipeline?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No opportunities recorded.</p>
            ) : (
              data.pipeline?.map((item: any) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{item.stage} ({item.count})</span>
                    <span className="font-mono">{formatCurrency(item.total_value || 0)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(10, (item.count / (totalOpportunities || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sales by Representative */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Revenue by Sales Representative</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Agent</TableHead>
                  <TableHead className="text-right">Won / Lost</TableHead>
                  <TableHead className="text-right">Won Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byAgent?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
                      No agent sales records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byAgent?.map((agent: any) => (
                    <TableRow key={agent.agent || 'Unknown'}>
                      <TableCell className="font-semibold">{agent.agent || 'Unassigned'}</TableCell>
                      <TableCell className="text-right text-xs">
                        <span className="text-emerald-600 font-semibold">{agent.won}</span> /{' '}
                        <span className="text-red-500">{agent.lost}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(agent.won_value || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

