"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Tag } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function LeadSourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leads/sources');
      if (res.data.success && res.data.data) {
        setSources(res.data.data);
      }
    } catch {
      toast.error('Failed to load lead sources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <PageHeader
        title="Lead Sources"
        subtitle="Configure marketing channels, inbound sources, and website enquiry origins"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Lead Sources' },
        ]}
      />

      <Card className="shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <LoadingSpinner size="md" text="Loading lead sources..." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 p-3 rounded-lg border bg-card/60 shadow-xs"
                >
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

