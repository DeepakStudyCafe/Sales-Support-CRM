"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Users, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function EmployeePerformanceReportsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformance = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange);
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await api.get('/reports/performance', { params: { dateFrom } });
      if (res.data.success && res.data.data) {
        setEmployees(res.data.data);
      }
    } catch {
      toast.error('Failed to load employee leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Performance Leaderboard"
        subtitle="Cross-functional productivity metrics: sales conversions, call activity, ticket resolution, and task adherence"
        breadcrumbs={[
          { label: 'Reports', href: '/reports/leads' },
          { label: 'Employee Performance' },
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
            <Button variant="outline" size="icon" onClick={fetchPerformance}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Overall Employee Ranking
          </CardTitle>
          <span className="text-xs text-muted-foreground">{employees.length} active employees</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Leads Assigned</TableHead>
                <TableHead className="text-right">Leads Converted</TableHead>
                <TableHead className="text-right">Calls Made</TableHead>
                <TableHead className="text-right">Tickets Resolved</TableHead>
                <TableHead className="text-right">Tasks Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                    Calculating productivity metrics...
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                    No employee activity recorded for this period.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.employee_name}>
                    <TableCell className="font-semibold text-foreground flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {emp.employee_name?.[0] || 'U'}
                      </div>
                      {emp.employee_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {emp.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{emp.leads_assigned || 0}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {emp.leads_converted || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">{emp.calls_made || 0}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-600">
                      {emp.tickets_resolved || 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">{emp.tasks_completed || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

