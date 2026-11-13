"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
  MoreVertical,
  Copy,
  Check,
  Shield,
  PhoneCall
} from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AllUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset Password Dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery || undefined,
          isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        },
      });

      if (res.data.success && res.data.data) {
        let data = res.data.data;
        if (roleFilter !== 'all') {
          data = data.filter((u: any) => u.role_name === roleFilter);
        }
        setUsers(data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: any) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    try {
      const res = await api.patch(`/users/${user.id}/${action}`);
      if (res.data.success) {
        toast.success(`User ${user.first_name} ${user.last_name} ${action}d successfully`);
        fetchUsers();
      }
    } catch {
      toast.error(`Failed to ${action} user`);
    }
  };

  const initiateResetPassword = async (user: any) => {
    setSelectedUser(user);
    setTempPassword(null);
    setCopied(false);
    setResetDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedUser) return;
    setIsResetting(true);
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`);
      if (res.data.success && res.data.data) {
        setTempPassword(res.data.data.temporaryPassword);
        toast.success('Password reset successfully');
      }
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Temporary password copied to clipboard');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Employee Name & Email',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
            {row.first_name?.[0] || 'U'}{row.last_name?.[0] || ''}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role_name',
      header: 'Role',
      cell: (row) => {
        const role = row.role_name;
        let variant: 'default' | 'secondary' | 'outline' = 'secondary';
        if (role === 'Super Admin') variant = 'default';
        return (
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <Badge variant={variant} className="text-xs font-medium">
              {role}
            </Badge>
          </span>
        );
      },
    },
    {
      key: 'department_name',
      header: 'Department & Team',
      cell: (row) => (
        <div className="text-xs">
          <p className="font-medium text-foreground">{row.department_name || 'General'}</p>
          <p className="text-muted-foreground">{row.team_name || 'No Team'}</p>
        </div>
      ),
    },
    {
      key: 'ivr_extension',
      header: 'IVR Extension',
      cell: (row) =>
        row.ivr_extension ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">
            <PhoneCall className="h-3 w-3 text-primary" /> {row.ivr_extension}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.is_active
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => {
        if (row.role_name === 'Super Admin') return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => initiateResetPassword(row)} className="gap-2 cursor-pointer">
                <KeyRound className="h-4 w-4 text-primary" /> Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToggleStatus(row)}
                className={`gap-2 cursor-pointer ${row.is_active ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {row.is_active ? (
                  <>
                    <UserX className="h-4 w-4" /> Deactivate User
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" /> Activate User
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Users & Employees"
        subtitle="Manage user accounts, credentials, IVR extensions, and system access"
        breadcrumbs={[
          { label: 'User Management', href: '/users' },
          { label: 'All Users' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/users/create-admin">Create Admin</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/users/create-sales">Create Sales</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/users/create-support">
                <UserPlus className="h-4 w-4 mr-1.5" /> Create Support
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Support">Support</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPagination(p => ({ ...p, page: 1 })); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
          onPageChange: (newPage) => setPagination((p) => ({ ...p, page: newPage })),
          onLimitChange: (newLimit) => setPagination((p) => ({ ...p, limit: newLimit, page: 1 })),
        }}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search users by name or email...',
        }}
        emptyState={{
          icon: Users,
          title: 'No users found',
          description: 'Try adjusting search or filters.',
        }}
      />

      {/* Reset Password Modal */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
          </DialogHeader>

          {!tempPassword ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-foreground">
                Are you sure you want to reset the password for employee{' '}
                <strong className="text-primary">{selectedUser?.first_name} {selectedUser?.last_name}</strong> ({selectedUser?.email})?
              </p>
              <p className="text-xs text-muted-foreground">
                A secure temporary password will be generated. The user will be required to change it on their next login.
              </p>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmReset} disabled={isResetting}>
                  {isResetting ? 'Resetting...' : 'Generate Temporary Password'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-800 dark:text-emerald-300 text-sm">
                Password has been successfully reset!
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Temporary Password:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={tempPassword}
                    className="flex-1 font-mono text-sm px-3 py-2 rounded-md border bg-muted"
                  />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Please copy and share this temporary password securely with the employee. It will not be shown again.
              </p>

              <DialogFooter className="pt-2">
                <Button onClick={() => setResetDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

