"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Headphones, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { ModulePermissionSelector } from '@/components/users/ModulePermissionSelector';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CreateSupportUserPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedModules, setSelectedModules] = useState<string[]>([
    'tickets',
    'customers',
    'calling',
    'followups',
    'reports',
  ]);

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
        roleName: 'Support',
        department_id: formData.department_id || undefined,
        team_id: formData.team_id || undefined,
        ivr_extension: formData.ivr_extension || undefined,
        ivr_agent_id: formData.ivr_agent_id || undefined,
        modules: selectedModules,
      });

      if (res.data.success) {
        toast.success('Support Executive account created with customized permissions');
        router.push('/users');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create support executive');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <PageHeader
        title="Create Support Executive Account"
        subtitle="Provision an employee account with customer ticket queues, SLAs, and inbound call routing"
        breadcrumbs={[
          { label: 'User Management', href: '/users' },
          { label: 'Create Support User' },
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
            <Headphones className="h-4 w-4 text-primary" />
            Support Executive Information
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
                  placeholder="e.g. Pooja"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Verma"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pooja.verma@company.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
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
                placeholder="Min 8 characters (e.g. Support@123)"
                required
              />
              <p className="text-xs text-muted-foreground">The employee can change their password anytime after first login.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="ivr_extension">Cloud Telephony Extension</Label>
                <Input
                  id="ivr_extension"
                  value={formData.ivr_extension}
                  onChange={(e) => setFormData({ ...formData, ivr_extension: e.target.value })}
                  placeholder="e.g. 201"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ivr_agent_id">IVR Agent ID</Label>
                <Input
                  id="ivr_agent_id"
                  value={formData.ivr_agent_id}
                  onChange={(e) => setFormData({ ...formData, ivr_agent_id: e.target.value })}
                  placeholder="e.g. AGENT_SUPPORT_01"
                />
              </div>
            </div>

            {/* Interactive Module Permissions */}
            <div className="pt-2 border-t">
              <ModulePermissionSelector
                selectedModules={selectedModules}
                onChange={setSelectedModules}
                roleName="Support"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => router.push('/users')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? 'Creating Support User...' : 'Create Support User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
