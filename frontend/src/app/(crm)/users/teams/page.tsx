"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Plus, RefreshCw, Briefcase } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function TeamsAndDepartmentsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Team Dialog
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamDeptId, setTeamDeptId] = useState('');
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  // Department Dialog
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [teamsRes, deptsRes] = await Promise.all([
        api.get('/teams'),
        api.get('/teams/departments/all'),
      ]);
      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (deptsRes.data.success) setDepartments(deptsRes.data.data);
    } catch {
      toast.error('Failed to load organization structure');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsSubmittingTeam(true);
    try {
      const res = await api.post('/teams', {
        name: teamName.trim(),
        description: teamDesc.trim() || undefined,
        department_id: teamDeptId || undefined,
      });

      if (res.data.success) {
        toast.success('Team created successfully');
        setIsTeamModalOpen(false);
        setTeamName('');
        setTeamDesc('');
        setTeamDeptId('');
        fetchData();
      }
    } catch {
      toast.error('Failed to create team');
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    setIsSubmittingDept(true);
    try {
      const res = await api.post('/teams/departments', {
        name: deptName.trim(),
        description: deptDesc.trim() || undefined,
      });

      if (res.data.success) {
        toast.success('Department created successfully');
        setIsDeptModalOpen(false);
        setDeptName('');
        setDeptDesc('');
        fetchData();
      }
    } catch {
      toast.error('Failed to create department');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams & Departments"
        subtitle="Manage organizational hierarchy, department groupings, and team assignments"
        breadcrumbs={[
          { label: 'User Management', href: '/users' },
          { label: 'Teams & Departments' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsDeptModalOpen(true)} className="gap-1.5">
              <Building2 className="h-4 w-4" /> Add Department
            </Button>
            <Button onClick={() => setIsTeamModalOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Team
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="teams" className="w-full">
        <TabsList>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" /> Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" /> Departments ({departments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="pt-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card p-6">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-foreground">No Teams Defined</p>
              <p className="text-sm">Click &quot;Add Team&quot; to organize employees into functional units.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> {t.name}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full">
                        {t.member_count ?? 0} members
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground text-xs min-h-[36px]">
                      {t.description || 'No description provided.'}
                    </p>
                    <div className="pt-2 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium text-foreground">{t.department_name || 'General'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments" className="pt-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading departments...
            </div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card p-6">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-foreground">No Departments Defined</p>
              <p className="text-sm">Create high-level departments such as Sales, Support, Operations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((d) => (
                <Card key={d.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> {d.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground text-xs min-h-[36px]">
                      {d.description || 'No description provided.'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Team Dialog */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Team Name *</Label>
              <Input
                id="t-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Inbound Sales - North, Tier 2 Support"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea
                id="t-desc"
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                placeholder="Team responsibilities..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={teamDeptId} onValueChange={setTeamDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTeamModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingTeam || !teamName.trim()}>
                {isSubmittingTeam ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Department Dialog */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDepartment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-name">Department Name *</Label>
              <Input
                id="d-name"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Sales, Customer Support, Marketing"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d-desc">Description</Label>
              <Textarea
                id="d-desc"
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                placeholder="Department function..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingDept || !deptName.trim()}>
                {isSubmittingDept ? 'Creating...' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

