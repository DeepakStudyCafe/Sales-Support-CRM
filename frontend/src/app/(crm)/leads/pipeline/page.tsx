"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Phone, ArrowRight, User } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

const STAGES = [
  { id: 'New', title: 'New Leads', color: 'border-t-blue-500' },
  { id: 'Contacted', title: 'Contacted', color: 'border-t-sky-500' },
  { id: 'Interested', title: 'Interested', color: 'border-t-amber-500' },
  { id: 'Follow-up', title: 'Follow-up Required', color: 'border-t-purple-500' },
  { id: 'Qualified', title: 'Qualified Deals', color: 'border-t-emerald-500' },
  { id: 'Converted', title: 'Converted Customers', color: 'border-t-teal-600' },
];

export default function LeadPipelinePage() {
  const [leadsByStage, setLeadsByStage] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leads?limit=100');
      if (res.data.success && res.data.data) {
        const grouped: Record<string, any[]> = {
          New: [],
          Contacted: [],
          Interested: [],
          'Follow-up': [],
          Qualified: [],
          Converted: [],
        };

        res.data.data.forEach((lead: any) => {
          if (grouped[lead.status]) {
            grouped[lead.status].push(lead);
          }
        });
        setLeadsByStage(grouped);
      }
    } catch {
      toast.error('Failed to load pipeline leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const moveStage = async (leadId: string, currentStage: string, newStage: string) => {
    try {
      const res = await api.put(`/leads/${leadId}`, { status: newStage });
      if (res.data.success) {
        toast.success(`Lead moved to ${newStage}`);
        fetchLeads();
      }
    } catch {
      toast.error('Failed to update stage');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Lead Pipeline Board"
        subtitle="Visual stage progression and deal movement through sales funnel"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Lead Pipeline' },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/leads">
              <Button variant="outline" size="sm" className="h-9 text-xs">
                List View
              </Button>
            </Link>
            <Link href="/leads/add">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" /> Add Lead
              </Button>
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading visual pipeline board..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.id] || [];
            return (
              <div
                key={stage.id}
                className={`flex flex-col rounded-xl border border-t-4 bg-muted/30 p-3 min-w-[220px] ${stage.color}`}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-xs font-bold tracking-tight text-foreground uppercase">
                    {stage.title}
                  </h4>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[11px] font-bold text-muted-foreground border">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground/80">
                      Empty stage
                    </div>
                  ) : (
                    stageLeads.map((lead: any) => (
                      <Card
                        key={lead.id}
                        className="p-3 shadow-xs hover:shadow-md transition-all duration-200 bg-card border-border/80"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-semibold text-xs text-primary hover:underline line-clamp-1"
                          >
                            {lead.first_name} {lead.last_name || ''}
                          </Link>
                          <PriorityBadge priority={lead.priority} />
                        </div>

                        {lead.company && (
                          <p className="text-[11px] text-muted-foreground font-medium mb-2 line-clamp-1">
                            {lead.company}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" />
                            {lead.assigned_to_name ? lead.assigned_to_name.split(' ')[0] : 'Unassigned'}
                          </span>

                          {/* Quick stage advance */}
                          {stage.id !== 'Converted' && (
                            <button
                              onClick={() => {
                                const currentIndex = STAGES.findIndex((s) => s.id === stage.id);
                                if (currentIndex < STAGES.length - 1) {
                                  moveStage(lead.id, stage.id, STAGES[currentIndex + 1].id);
                                }
                              }}
                              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                              title="Advance to next stage"
                            >
                              Advance <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

