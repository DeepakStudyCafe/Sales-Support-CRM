"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Megaphone, RefreshCw, BarChart3, CheckCircle } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CampaignReportsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/campaigns');
      if (res.data.success && res.data.data) {
        setCampaigns(res.data.data);
      }
    } catch {
      toast.error('Failed to load campaign performance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const totalContacts = campaigns.reduce((acc, c) => acc + (c.total_contacts || 0), 0);
  const totalDialed = campaigns.reduce((acc, c) => acc + (c.dialed_contacts || 0), 0);
  const totalConnected = campaigns.reduce((acc, c) => acc + (c.connected_contacts || 0), 0);
  const overallConnectRate = totalDialed > 0 ? Math.round((totalConnected / totalDialed) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calling Campaign Reports"
        subtitle="Outbound dialer campaign performance, contact reach rates, and agent conversion metrics"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/leads' },
          { label: 'Campaign Reports' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-primary" /> Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Dialed Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDialed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-emerald-600" /> Overall Connect Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">{overallConnectRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Campaign Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Dialer Mode</TableHead>
                <TableHead className="text-right">Target Contacts</TableHead>
                <TableHead className="text-right">Dialed</TableHead>
                <TableHead className="text-right">Connected</TableHead>
                <TableHead className="text-right">Connect %</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                    Loading campaigns...
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((camp) => {
                  const connectRate =
                    camp.dialed_contacts > 0
                      ? Math.round(((camp.connected_contacts || 0) / camp.dialed_contacts) * 100)
                      : 0;
                  return (
                    <TableRow key={camp.id}>
                      <TableCell className="font-semibold">{camp.name}</TableCell>
                      <TableCell className="text-xs capitalize">{camp.dialer_mode || 'Preview'}</TableCell>
                      <TableCell className="text-right font-medium">{camp.total_contacts || 0}</TableCell>
                      <TableCell className="text-right">{camp.dialed_contacts || 0}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">
                        {camp.connected_contacts || 0}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{connectRate}%</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">
                          {camp.status}
                        </span>
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

