"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Users,
  PhoneCall,
  CalendarCheck,
  Headphones,
  Cpu,
  BarChart3,
  Settings,
  Shield,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export interface ModulePermissionOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  defaultFor: ('Admin' | 'Sales' | 'Support')[];
}

export const CRM_MODULES: ModulePermissionOption[] = [
  {
    id: 'leads',
    name: 'Sales Leads & Pipelines',
    description: 'Create, view, manage, and assign sales leads and pipelines',
    icon: Briefcase,
    defaultFor: ['Admin', 'Sales'],
  },
  {
    id: 'opportunities',
    name: 'Opportunities & Quotations',
    description: 'Track potential deals, value estimation, and generate price quotes',
    icon: Briefcase,
    defaultFor: ['Admin', 'Sales'],
  },
  {
    id: 'customers',
    name: 'Customer Directory',
    description: 'Browse converted clients, contact records, and account histories',
    icon: Users,
    defaultFor: ['Admin', 'Sales', 'Support'],
  },
  {
    id: 'calling',
    name: 'Calling, Campaigns & Dialer',
    description: 'Outbound click-to-call, call campaigns, auto-dialer queues, and call history',
    icon: PhoneCall,
    defaultFor: ['Admin', 'Sales', 'Support'],
  },
  {
    id: 'followups',
    name: 'Follow-ups & Tasks',
    description: 'Manage scheduled call reminders, customer appointments, and pending tasks',
    icon: CalendarCheck,
    defaultFor: ['Admin', 'Sales', 'Support'],
  },
  {
    id: 'tickets',
    name: 'Support Tickets & Helpdesk',
    description: 'Handle customer support complaints, SLA timers, and issue resolutions',
    icon: Headphones,
    defaultFor: ['Admin', 'Support'],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'View employee lists, team structures, and assignment allocations',
    icon: Users,
    defaultFor: ['Admin'],
  },
  {
    id: 'automation',
    name: 'Automation & Assignment Rules',
    description: 'Configure auto-assignment algorithms, workflow triggers, and escalation rules',
    icon: Cpu,
    defaultFor: ['Admin'],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'View performance charts, lead conversion metrics, and call audit reports',
    icon: BarChart3,
    defaultFor: ['Admin', 'Sales', 'Support'],
  },
  {
    id: 'settings',
    name: 'System Configuration',
    description: 'Modify company working hours, telephony webhooks, and preferences',
    icon: Settings,
    defaultFor: ['Admin'],
  },
];

interface ModulePermissionSelectorProps {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
  roleName: 'Admin' | 'Sales' | 'Support';
}

export function ModulePermissionSelector({
  selectedModules,
  onChange,
  roleName,
}: ModulePermissionSelectorProps) {
  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      onChange(selectedModules.filter((id) => id !== moduleId));
    } else {
      onChange([...selectedModules, moduleId]);
    }
  };

  const selectAll = () => {
    onChange(CRM_MODULES.map((m) => m.id));
  };

  const selectDefaults = () => {
    const defaults = CRM_MODULES.filter((m) => m.defaultFor.includes(roleName)).map((m) => m.id);
    onChange(defaults);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
        <div>
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-primary" /> Module Access Permissions ({selectedModules.length} selected)
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Only the modules checked below will appear on this user&apos;s dashboard and sidebar navigation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectDefaults}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Reset to {roleName} Defaults
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            type="button"
            onClick={selectAll}
            className="text-[11px] font-semibold text-foreground hover:underline"
          >
            Select All
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold text-destructive hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {CRM_MODULES.map((mod) => {
          const Icon = mod.icon;
          const isSelected = selectedModules.includes(mod.id);
          return (
            <div
              key={mod.id}
              onClick={() => toggleModule(mod.id)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 text-foreground shadow-2xs'
                  : 'border-border bg-card hover:bg-muted/30 text-muted-foreground opacity-80'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="rounded mt-0.5 text-primary h-4 w-4"
              />
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-bold ${isSelected ? 'text-foreground' : ''}`}>
                    {mod.name}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {mod.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security notice regarding Delete restriction */}
      <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300">
        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          <strong>Security Policy:</strong> Deletion rights for all leads, customers, tickets, and user accounts are permanently restricted to Super Admin only.
        </span>
      </div>
    </div>
  );
}

