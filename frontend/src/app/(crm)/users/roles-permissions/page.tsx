"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Save, CheckCircle2, AlertTriangle, RefreshCw, Lock } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function RolesAndPermissionsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch roles & all permissions
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const [rolesRes, permsRes] = await Promise.all([
          api.get('/roles'),
          api.get('/roles/permissions'),
        ]);

        if (rolesRes.data.success) {
          const fetchedRoles = rolesRes.data.data;
          setRoles(fetchedRoles);
          // Default to first non-Super Admin role if available, or first role
          const defaultRole = fetchedRoles.find((r: any) => r.name !== 'Super Admin') || fetchedRoles[0];
          if (defaultRole) {
            setSelectedRoleId(defaultRole.id);
          }
        }

        if (permsRes.data.success) {
          setAllPermissions(permsRes.data.data);
        }
      } catch {
        toast.error('Failed to load roles and permission catalog');
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, []);

  // Fetch permissions for the selected role
  useEffect(() => {
    if (!selectedRoleId) return;

    async function fetchForRole() {
      try {
        const res = await api.get(`/roles/${selectedRoleId}/permissions`);
        if (res.data.success && res.data.data) {
          const map: Record<string, boolean> = {};
          res.data.data.forEach((p: any) => {
            map[p.id] = true;
          });
          setRolePermissions(map);
        }
      } catch {
        toast.error('Failed to load role permissions');
      }
    }

    fetchForRole();
  }, [selectedRoleId]);

  const handleTogglePermission = (permId: string) => {
    setRolePermissions((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  };

  const handleSavePermissions = async () => {
    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (selectedRole?.name === 'Super Admin') {
      toast.error('Super Admin has permanent full access and cannot be modified');
      return;
    }

    setIsSaving(true);
    try {
      const payload = allPermissions.map((p) => ({
        permissionId: p.id,
        granted: !!rolePermissions[p.id],
      }));

      const res = await api.put(`/roles/${selectedRoleId}/permissions`, {
        permissions: payload,
      });

      if (res.data.success) {
        toast.success(`Permissions updated for ${selectedRole?.name}`);
      }
    } catch {
      toast.error('Failed to update permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.name === 'Super Admin';

  // Group permissions by module
  const groupedPermissions = allPermissions.reduce((acc: Record<string, any[]>, perm) => {
    const mod = perm.module || 'General';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permission Matrix"
        subtitle="Manage access control, module visibility, and action privileges for each primary role"
        breadcrumbs={[
          { label: 'User Management', href: '/users' },
          { label: 'Roles & Permissions' },
        ]}
        actions={
          <Button
            onClick={handleSavePermissions}
            disabled={isSaving || isSuperAdmin || !selectedRoleId}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving Changes...' : 'Save Permissions'}
          </Button>
        }
      />

      {/* Role Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          return (
            <div
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                  : 'bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  {role.name}
                </span>
                {role.name === 'Super Admin' && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    Full Access
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {role.description || `Configured access role for ${role.name}`}
              </p>
            </div>
          );
        })}
      </div>

      {isSuperAdmin && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            <strong>Super Admin Role:</strong> By system architecture, Super Admin possesses immutable, unrestricted master access to all CRM modules and actions.
          </span>
        </div>
      )}

      {/* Permission Matrix by Module */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading permission catalog...
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
            <Card key={moduleName}>
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base uppercase tracking-wider text-xs font-bold text-muted-foreground">
                  Module: <span className="text-foreground text-sm font-semibold capitalize">{moduleName}</span> ({perms.length} Permissions)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {perms.map((perm) => {
                  const isGranted = isSuperAdmin || !!rolePermissions[perm.id];
                  return (
                    <div
                      key={perm.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    >
                      <div className="space-y-0.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {perm.name || `${perm.module}:${perm.submodule}:${perm.action}`}
                          </span>
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {perm.submodule} &bull; {perm.action}
                          </span>
                        </div>
                        {perm.description && (
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        )}
                      </div>

                      <Switch
                        checked={isGranted}
                        disabled={isSuperAdmin}
                        onCheckedChange={() => handleTogglePermission(perm.id)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

