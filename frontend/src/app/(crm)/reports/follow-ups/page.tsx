"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function FollowupReportsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFollowups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/follow-ups', { params: { limit: 100 } });
      if (res.data.success && res.data.data) {
        setTasks(res.data.data);
      }
    } catch {
      toast.error('Failed to load task analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'Pending').length;
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.status === 'Pending' && t.scheduled_at && new Date(t.scheduled_at) < now
  ).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-up & Task Adherence Reports"
        subtitle="Tracking scheduled follow-ups, team adherence, and task closure efficiency"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/leads' },
          { label: 'Follow-up Reports' },
        ]}
        actions={
          <Button variant="outline" size="icon" onClick={fetchFollowups}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {completedTasks} <span className="text-xs font-normal text-muted-foreground">({completionRate}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Pending Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Adherence Overview */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Team Follow-up Adherence</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span>Overall Task Closure Rate</span>
              <span className="font-bold text-primary">{completionRate}%</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A high task completion percentage ensures zero customer touchpoints slip through the cracks, leading to higher conversion rates and superior customer satisfaction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

