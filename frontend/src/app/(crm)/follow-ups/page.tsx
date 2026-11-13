"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Plus, CheckCircle, Calendar, Clock } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function FollowUpsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'Task',
    priority: 'Medium',
    scheduledAt: '',
    assignedTo: '',
  });

  const [users, setUsers] = useState<any[]>([]);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/follow-ups', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      if (res.data.success && res.data.data) {
        setTasks(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTasks();
    async function loadUsers() {
      try {
        const res = await api.get('/users?limit=100');
        if (res.data.success && res.data.data) {
          setUsers(res.data.data);
        }
      } catch {
        // Ignored
      }
    }
    loadUsers();
  }, [fetchTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.scheduledAt) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/follow-ups', {
        title: formData.title,
        type: formData.type,
        priority: formData.priority,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        assignedTo: formData.assignedTo || users[0]?.id,
      });

      if (res.data.success) {
        toast.success('Task created successfully');
        setModalOpen(false);
        setFormData({ title: '', type: 'Task', priority: 'Medium', scheduledAt: '', assignedTo: '' });
        fetchTasks();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const res = await api.patch(`/follow-ups/${id}/complete`, {});
      if (res.data.success) {
        toast.success('Task marked as completed');
        fetchTasks();
      }
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'title', header: 'Task Title', sortable: true },
    { key: 'type', header: 'Type', render: (t) => <span className="capitalize">{t.type}</span> },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'scheduled_at',
      header: 'Scheduled Date (IST)',
      sortable: true,
      render: (t) => formatDate(t.scheduled_at),
    },
    { key: 'assigned_to_name', header: 'Assigned Agent' },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div>
          {t.status !== 'Completed' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs text-emerald-600 hover:bg-emerald-50"
              onClick={() => handleMarkComplete(t.id)}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Mark Done
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Follow-ups & Tasks"
        subtitle="Manage callbacks, client meetings, reminders and daily actionable priorities"
        breadcrumbs={[
          { label: 'Follow-ups', href: '/follow-ups' },
          { label: 'My Tasks' },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/follow-ups/today">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" /> Today's Queue
              </Button>
            </Link>
            <Button size="sm" onClick={() => setModalOpen(true)} className="h-9 gap-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={tasks}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />

      {/* Create Task Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Follow-up Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="tTitle" className="text-xs" required>
                  Task Description
                </Label>
                <Input
                  id="tTitle"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Call customer to verify quote items"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Task">Task</SelectItem>
                      <SelectItem value="Callback">Callback</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tTime" className="text-xs" required>
                  Scheduled Date & Time (IST)
                </Label>
                <Input
                  id="tTime"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assign Agent</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSubmitting} className="font-semibold">
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

