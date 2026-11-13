"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import {
  BellRing,
  CheckCheck,
  Check,
  Calendar,
  AlertCircle,
  PhoneCall,
  Headphones,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function UnreadNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchUnread = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications', { params: { unreadOnly: 'true', limit: 50 } });
      if (res.data.success && res.data.data) {
        setNotifications(res.data.data);
      }
    } catch {
      toast.error('Failed to load unread alerts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  const handleMarkAsRead = async (notif: any) => {
    try {
      await api.patch(`/notifications/${notif.id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch {
      // ignore
    }

    if (notif.data) {
      try {
        const parsed = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        if (parsed.url) {
          router.push(parsed.url);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await api.patch('/notifications/mark-all-read');
      if (res.data.success) {
        toast.success('All notifications marked as read');
        setNotifications([]);
      }
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'followup_due':
      case 'followup_reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'ticket_assigned':
      case 'ticket_created':
        return <Headphones className="h-5 w-5 text-indigo-500" />;
      case 'ticket_sla_breached':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'lead_assigned':
        return <UserCheck className="h-5 w-5 text-emerald-500" />;
      case 'call_missed':
        return <PhoneCall className="h-5 w-5 text-amber-500" />;
      default:
        return <BellRing className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Unread Alerts & Notifications"
        subtitle="Items requiring your attention or response"
        breadcrumbs={[
          { label: 'Notifications', href: '/notifications' },
          { label: 'Unread' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || notifications.length === 0}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" /> Mark All as Read
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading unread alerts...
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCheck className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
            <p className="font-semibold text-foreground">Zero Unread Notifications</p>
            <p className="text-sm">You have reviewed all incoming messages, assignments, and alerts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkAsRead(notif)}
              className="rounded-lg border p-4 cursor-pointer transition-all flex items-start justify-between gap-4 bg-primary/5 border-primary/30 shadow-sm hover:bg-primary/10"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted mt-0.5 shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      {notif.title}
                    </h4>
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                  <span className="text-[11px] text-muted-foreground/70 mt-1 block">
                    {formatDate(notif.created_at)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(notif);
                }}
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

