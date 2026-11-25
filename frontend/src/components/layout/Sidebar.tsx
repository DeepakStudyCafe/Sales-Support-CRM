"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  PhoneCall,
  CalendarCheck,
  UserCheck,
  Headphones,
  Bell,
  Cpu,
  BarChart3,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface SubMenuItem {
  title: string;
  href: string;
  module?: string;
  submodule?: string;
  action?: string;
}

interface MenuItem {
  title: string;
  icon: React.ElementType;
  href?: string;
  module: string;
  submodule?: string;
  action?: string;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
    children: [
      { title: 'Overview', href: '/dashboard', module: 'dashboard', submodule: 'overview' },
      { title: 'Sales Dashboard', href: '/dashboard/sales', module: 'leads', submodule: 'sales' },
      { title: 'Calling Dashboard', href: '/dashboard/calling', module: 'calling', submodule: 'calling' },
      { title: 'Support Dashboard', href: '/dashboard/support', module: 'tickets', submodule: 'support' },
    ],
  },
  {
    title: 'User Management',
    icon: Users,
    module: 'users',
    children: [
      { title: 'All Users', href: '/users', module: 'users', submodule: 'all' },
      { title: 'Create Admin', href: '/users/create-admin', module: 'users', submodule: 'all', action: 'create' },
      { title: 'Create Sales User', href: '/users/create-sales', module: 'users', submodule: 'all', action: 'create' },
      { title: 'Create Support User', href: '/users/create-support', module: 'users', submodule: 'all', action: 'create' },
      { title: 'Teams & Departments', href: '/users/teams', module: 'users', submodule: 'teams' },
      { title: 'Roles & Permissions', href: '/users/roles-permissions', module: 'users', submodule: 'permissions' },
    ],
  },
  {
    title: 'Sales',
    icon: Briefcase,
    module: 'leads',
    children: [
      { title: 'All Leads', href: '/leads', module: 'leads', submodule: 'all' },
      { title: 'Add Lead', href: '/leads/add', module: 'leads', submodule: 'all', action: 'create' },
      { title: 'Lead Assignment', href: '/leads/assignment', module: 'leads', submodule: 'assignment' },
      { title: 'Lead Sources', href: '/leads/sources', module: 'leads', submodule: 'sources' },
      { title: 'Lead Pipeline', href: '/leads/pipeline', module: 'leads', submodule: 'pipeline' },
      { title: 'Opportunities', href: '/opportunities', module: 'opportunities', submodule: 'all' },
      { title: 'Quotations', href: '/quotations', module: 'quotations', submodule: 'all' },
      { title: 'Customers', href: '/customers', module: 'customers', submodule: 'all' },
      { title: 'Lost Leads', href: '/leads/lost', module: 'leads', submodule: 'all' },
      { title: 'Follow-ups', href: '/follow-ups', module: 'followups', submodule: 'all' },
    ],
  },
  {
    title: 'Calling & IVR',
    icon: PhoneCall,
    module: 'calling',
    children: [
      { title: 'Click-to-Call', href: '/calling/click-to-call', module: 'calling', submodule: 'click-to-call' },
      { title: 'Call History', href: '/calling/history', module: 'calling', submodule: 'history' },
      { title: 'Inbound Calls', href: '/calling/inbound', module: 'calling', submodule: 'history' },
      { title: 'Missed Calls', href: '/calling/missed', module: 'calling', submodule: 'history' },
      { title: 'Call Recordings', href: '/calling/recordings', module: 'calling', submodule: 'recordings' },
      { title: 'Automatic Dialer', href: '/calling/dialer', module: 'calling', submodule: 'campaigns' },
      { title: 'Calling Campaigns', href: '/calling/campaigns', module: 'calling', submodule: 'campaigns' },
      { title: 'Agent Management', href: '/calling/agents', module: 'calling', submodule: 'agents' },
      { title: 'IVR Settings', href: '/calling/ivr-settings', module: 'calling', submodule: 'ivr-settings' },
    ],
  },
  {
    title: 'Follow-ups & Tasks',
    icon: CalendarCheck,
    module: 'followups',
    children: [
      { title: 'My Tasks', href: '/follow-ups', module: 'followups', submodule: 'all' },
      { title: "Today's Follow-ups", href: '/follow-ups/today', module: 'followups', submodule: 'all' },
      { title: 'Upcoming Follow-ups', href: '/follow-ups/upcoming', module: 'followups', submodule: 'all' },
      { title: 'Overdue Tasks', href: '/follow-ups/overdue', module: 'followups', submodule: 'all' },
      { title: 'Completed Tasks', href: '/follow-ups/completed', module: 'followups', submodule: 'all' },
    ],
  },
  {
    title: 'Customer Management',
    icon: UserCheck,
    module: 'customers',
    children: [
      { title: 'All Customers', href: '/customers', module: 'customers', submodule: 'all' },
    ],
  },
  {
    title: 'Support',
    icon: Headphones,
    module: 'tickets',
    children: [
      { title: 'All Tickets', href: '/tickets', module: 'tickets', submodule: 'all' },
      { title: 'Create Ticket', href: '/tickets/create', module: 'tickets', submodule: 'all', action: 'create' },
      { title: 'My Tickets', href: '/tickets/my', module: 'tickets', submodule: 'all' },
      { title: 'Assigned Tickets', href: '/tickets/assigned', module: 'tickets', submodule: 'all' },
      { title: 'Ticket Categories', href: '/tickets/categories', module: 'tickets', submodule: 'categories' },
      { title: 'SLA Management', href: '/tickets/sla', module: 'tickets', submodule: 'sla' },
      { title: 'Escalations', href: '/tickets/escalations', module: 'tickets', submodule: 'escalations' },
      { title: 'Resolved Tickets', href: '/tickets/resolved', module: 'tickets', submodule: 'all' },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    module: 'notifications',
    children: [
      { title: 'All Notifications', href: '/notifications', module: 'notifications' },
      { title: 'Unread Notifications', href: '/notifications/unread', module: 'notifications' },
      { title: 'Notification Settings', href: '/notifications/settings', module: 'notifications' },
    ],
  },
  {
    title: 'Automation',
    icon: Cpu,
    module: 'automation',
    children: [
      { title: 'Workflow Rules', href: '/automation/workflows', module: 'automation', submodule: 'workflows' },
      { title: 'Auto Assignment', href: '/automation/auto-assignment', module: 'automation', submodule: 'workflows' },
      { title: 'Reminder Rules', href: '/automation/reminders', module: 'automation', submodule: 'workflows' },
      { title: 'Escalation Rules', href: '/automation/escalations', module: 'automation', submodule: 'workflows' },
    ],
  },
  {
    title: 'Reports & Analytics',
    icon: BarChart3,
    module: 'reports',
    children: [
      { title: 'Lead Reports', href: '/reports/leads', module: 'reports', submodule: 'leads' },
      { title: 'Sales Reports', href: '/reports/sales', module: 'reports', submodule: 'sales' },
      { title: 'Calling Reports', href: '/reports/calling', module: 'reports', submodule: 'calling' },
      { title: 'Campaign Reports', href: '/reports/campaigns', module: 'reports', submodule: 'calling' },
      { title: 'Follow-up Reports', href: '/reports/follow-ups', module: 'reports', submodule: 'calling' },
      { title: 'Support Reports', href: '/reports/support', module: 'reports', submodule: 'support' },
      { title: 'Employee Performance', href: '/reports/performance', module: 'reports', submodule: 'performance' },
    ],
  },
  {
    title: 'Activity & Audit Logs',
    icon: History,
    module: 'audit',
    children: [
      { title: 'Employee Activities', href: '/activity-logs/employees', module: 'audit', submodule: 'all' },
      { title: 'Login History', href: '/activity-logs/login-history', module: 'users', submodule: 'activity' },
      { title: 'System Audit Logs', href: '/activity-logs/audit', module: 'audit', submodule: 'all' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    module: 'settings',
    children: [
      { title: 'General Settings', href: '/settings/general', module: 'settings', submodule: 'general' },
      { title: 'Company Settings', href: '/settings/company', module: 'settings', submodule: 'company' },
      { title: 'Working Hours', href: '/settings/working-hours', module: 'settings', submodule: 'general' },
      { title: 'Notification Settings', href: '/settings/notifications', module: 'settings', submodule: 'general' },
      { title: 'Calling Settings', href: '/settings/calling', module: 'settings', submodule: 'calling' },
      { title: 'Email Settings', href: '/settings/email', module: 'settings', submodule: 'general' },
      { title: 'Theme Settings', href: '/settings/theme', module: 'settings', submodule: 'general' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission, user } = useAuth();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    Dashboard: true,
    Sales: true,
    'Calling & IVR': true,
  });

  // Auto-expand the active section based on current pathname
  useEffect(() => {
    menuItems.forEach((item) => {
      if (
        item.children?.some(
          (child) => pathname === child.href || (child.href !== '/dashboard' && pathname.startsWith(child.href))
        )
      ) {
        setExpandedModules((prev) => ({
          ...prev,
          [item.title]: true,
        }));
      }
    });
  }, [pathname]);

  const toggleModule = (title: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Filter modules based on permission
  const filteredMenuItems = menuItems
    .map((item) => {
      if (!user) return null;
      if (user.roleName === 'Super Admin') return item;

      // If item has children, filter its children based on permissions
      if (item.children && item.children.length > 0) {
        const permittedChildren = item.children.filter((child) => {
          if (!child.module) return true;
          if (child.href === '/dashboard') return true;
          return hasPermission(child.module, child.submodule, child.action);
        });

        if (permittedChildren.length === 0) {
          return null; // Don't show parent group if no submodules are permitted
        }

        return {
          ...item,
          children: permittedChildren,
        };
      }

      // If item has no children, check item itself
      if (item.module === 'dashboard' || item.module === 'notifications') return item;
      if (hasPermission(item.module, item.submodule, item.action)) {
        return item;
      }

      return null;
    })
    .filter((item): item is MenuItem => item !== null);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card shadow-lg transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm font-bold text-lg">
            CR
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground leading-none">
              SalesCRM Pro
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Enterprise Suite
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = !!expandedModules[item.title];
            const hasChildren = item.children && item.children.length > 0;

            const isChildActive =
              hasChildren &&
              item.children?.some(
                (child) => pathname === child.href || (child.href !== '/dashboard' && pathname.startsWith(child.href))
              );

            return (
              <div key={item.title} className="mb-1">
                {hasChildren ? (
                  <button
                    onClick={() => toggleModule(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-colors",
                      isChildActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", isChildActive ? "text-primary" : "text-muted-foreground")} />
                      <span>{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href || '#'}
                    onClick={() => {
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )}

                {/* Submenu items */}
                {hasChildren && isExpanded && (
                  <div className="ml-4 mt-1 pl-3 border-l border-border/60 space-y-0.5">
                    {item.children?.map((child) => {
                        const isActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => {
                              if (window.innerWidth < 768) onClose();
                            }}
                            className={cn(
                              "flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Role Footer */}
        <div className="border-t p-3 bg-muted/20">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground line-clamp-1">
                {user?.fullName || `${user?.firstName} ${user?.lastName}`}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {user?.roleName || 'Employee'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

