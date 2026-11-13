"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Phone, CheckCircle, XCircle } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAgents() {
      setIsLoading(true);
      try {
        const res = await api.get('/users?limit=100');
        if (res.data.success && res.data.data) {
          setAgents(res.data.data);
        }
      } catch {
        toast.error('Failed to load agents');
      } finally {
        setIsLoading(false);
      }
    }
    loadAgents();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <PageHeader
        title="Agent Extension Mapping"
        subtitle="Manage telephony extensions, agent IDs, and assigned DID lines for Click-to-Call routing"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Agent Management' },
        ]}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Representatives & Telephony Extensions</CardTitle>
          <CardDescription className="text-xs">
            Assigned IVR agent extensions used when bridging calls via IVR Solutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner size="md" text="Loading agent extensions..." />
          ) : (
            <div className="divide-y text-xs">
              {agents.map((agent) => (
                <div key={agent.id} className="py-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm">
                      {agent.first_name} {agent.last_name}
                    </span>
                    <span className="text-muted-foreground">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span>Ext: {agent.ivr_extension || 'Not set'}</span>
                    </div>
                    <div>
                      {agent.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-400 font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

