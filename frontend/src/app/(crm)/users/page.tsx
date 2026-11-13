"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExcelExportButton } from '@/components/shared/ExcelExportButton';
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
  PhoneCall,
  FolderTree,
  ShieldAlert,
  History,
} from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AllUsersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'teams' | 'roles' | 'history'>('all');
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);

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
    try {
      await api.patch(`/users/${user.id}/status`, { isActive: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (activate: boolean) => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'users',
        action: 'status',
        ids: selectedIds,
        payload: { isActive: activate },
      });
      toast.success(res.data?.message || `Updated status for ${selectedIds.length} users.`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update users');
    }
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds([]);
      setIsAllFilteredSelected(false);
    } else {
      setSelectedIds(users.map((u) => u.id));
      setIsAllFilteredSelected(true);
      toast.info(`Selected all ${pagination.total} users.`);
    }
  };

  const initiateResetPassword = (user: any) => {
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
      if (res.data.success && res.data.data?.temporaryPassword) {
        setTempPassword(res.data.data.temporaryPassword);
        toast.success(`Password reset for ${selectedUser.first_name}`);
      } else {
        toast.success('Temporary password generated and sent to user email');
        setResetDialogOpen(false);
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
      toast.info('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return 'destructive';
      case 'Admin':
        return 'default';
      case 'Sales':
        return 'secondary';
      case 'Support':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Full Name',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">
            {row.first_name} {row.last_name}
          </span>
          <span className="text-[11px] text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'role_name',
      header: 'Role',
      sortable: true,
      cell: (row) => (
        <Badge variant={getRoleBadgeVariant(row.role_name)} className="text-[10px]">
          {row.role_name}
        </Badge>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (row) => <span className="font-mono text-xs">{row.phone || '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department / Team',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.department_name || 'General'}
        </span>
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
    <div className="space-y-6 pb-16">
      <PageHeader
        title="User Management Hub"
        subtitle="Manage employee accounts, role-based access control, IVR extensions, and departments"
        breadcrumbs={[
          { label: 'Admin', href: '/users' },
          { label: 'Users Hub' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ExcelExportButton module="users" selectedIds={selectedIds} label="Export Users" />
            <Link href="/users/create-admin">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="h-3.5 w-3.5" /> Create User
              </Button>
            </Link>
          </div>
        }
      />

      {/* Unified Tabbed Navigation Hub */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          All Employees
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {pagination.total}
          </span>
        </button>

        <Link href="/users/teams">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <FolderTree className="h-3.5 w-3.5" />
            Teams & Departments
          </button>
        </Link>

        <Link href="/users/roles-permissions">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <ShieldAlert className="h-3.5 w-3.5" />
            Roles & Permissions
          </button>
        </Link>

        <Link href="/activity-logs/login-history">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <History className="h-3.5 w-3.5" />
            Login & Activity History
          </button>
        </Link>
      </div>

      {/* Users Table with Bulk Operations */}
      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        onSearch={(q) => {
          setSearchQuery(q);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search by name, email, or extension..."
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onSelectAllFiltered={handleSelectAllFiltered}
        isAllFilteredSelected={isAllFilteredSelected}
        bulkActions={[
          {
            label: 'Activate Selected',
            icon: <UserCheck className="h-3.5 w-3.5 text-emerald-400" />,
            onClick: () => handleBulkStatusChange(true),
          },
          {
            label: 'Deactivate Selected',
            icon: <UserX className="h-3.5 w-3.5 text-rose-400" />,
            variant: 'destructive',
            onClick: () => handleBulkStatusChange(false),
          },
        ]}
        filterSlot={
          <div className="flex gap-2">
            <Select
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Super Admin">Super Admin</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Reset User Password
            </DialogTitle>
          </DialogHeader>

          {!tempPassword ? (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate a temporary system password for{' '}
                <strong className="text-foreground">
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </strong>{' '}
                ({selectedUser?.email}). The user will be required to change their password upon their next login.
              </p>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmReset} isLoading={isResetting} className="font-semibold">
                  Generate Temp Password
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  Temporary Password Generated:
                </p>
                <div className="flex items-center justify-between bg-white dark:bg-black/40 px-3 py-2 rounded border border-emerald-200 dark:border-emerald-800 font-mono text-sm tracking-wider">
                  <span className="font-bold text-foreground">{tempPassword}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" onClick={() => setResetDialogOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
