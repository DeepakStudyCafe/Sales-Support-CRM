"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneCall, TrendingUp, ChevronLeft } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CreateSalesUserPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    department_id: '',
    team_id: '',
    ivr_extension: '',
    ivr_agent_id: '',
  });

  useEffect(() => {
    async function fetchOrgStructure() {
      try {
        const [deptRes, teamRes] = await Promise.all([
          api.get('/teams/departments/all'),
          api.get('/teams'),
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
        if (teamRes.data.success) setTeams(teamRes.data.data);
      } catch {
        // ignore
      }
    }
    fetchOrgStructure();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/users', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        roleName: 'Sales',
        department_id: formData.department_id || undefined,
        team_id: formData.team_id || undefined,
        ivr_extension: formData.ivr_extension || undefined,
        ivr_agent_id: formData.ivr_agent_id || undefined,
      });

      if (res.data.success) {
        toast.success('Sales Executive account created successfully');
        router.push('/users');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create sales executive');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Create Sales Executive Account"
        subtitle="Provision an employee account with sales pipelines, leads, and telephony access"
        breadcrumbs={[
          { label: 'User Management', href: '/users' },
          { label: 'Create Sales User' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/users')} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Cancel
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Sales Executive Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. Amit"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Sharma"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="amit.sharma@company.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 12345"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Initial Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 8 characters (e.g. Sales@123)"
                required
              />
            </div>

            {/* IVR Integration mapping */}
            <div className="p-4 rounded-lg bg-muted/40 border space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" />
                Telephony & IVR Configuration
              </h3>
              <p className="text-xs text-muted-foreground">
                Required for Click-to-Call (`/api/c2c_get`) and outbound campaign dialer routing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ivr_extension">IVR Extension Number</Label>
                  <Input
                    id="ivr_extension"
                    value={formData.ivr_extension}
                    onChange={(e) => setFormData({ ...formData, ivr_extension: e.target.value })}
                    placeholder="e.g. 101, 8001"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ivr_agent_id">IVR Agent ID</Label>
                  <Input
                    id="ivr_agent_id"
                    value={formData.ivr_agent_id}
                    onChange={(e) => setFormData({ ...formData, ivr_agent_id: e.target.value })}
                    placeholder="e.g. AGENT-101"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(val) => setFormData({ ...formData, department_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(val) => setFormData({ ...formData, team_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push('/users')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Sales User...' : 'Create Sales Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

