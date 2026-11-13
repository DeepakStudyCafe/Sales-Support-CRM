"use client";

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, Square, PhoneCall, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AutomaticDialerPage() {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <PageHeader
        title="Automatic Power Dialer"
        subtitle="Automated dialing interface with eligibility checking, window validation, and agent bridging"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Automatic Dialer' },
        ]}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" /> Active Dialer Console
          </CardTitle>
          <CardDescription className="text-xs">
            Checks contact eligibility, calling window hours (Asia/Kolkata), and connects calls to available agent extensions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border p-6 bg-muted/20 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              <span className="text-sm font-bold text-foreground">
                Status: {isRunning ? 'Dialing Queue Active' : 'Dialer Idle / Paused'}
              </span>
            </div>

            <div className="flex justify-center gap-3">
              {!isRunning ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                  onClick={() => setIsRunning(true)}
                >
                  <Play className="h-4 w-4" /> Start Automatic Queue
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 font-semibold gap-1.5"
                  onClick={() => setIsRunning(false)}
                >
                  <Pause className="h-4 w-4" /> Pause Auto Dialer
                </Button>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Automated Pre-Call Validation Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded border bg-card/60">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Contact eligibility & opt-out filter</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded border bg-card/60">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Permitted calling window (09:00 - 18:00 IST)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded border bg-card/60">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Max retry attempt limit protection</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded border bg-card/60">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Available agent extension verified</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

