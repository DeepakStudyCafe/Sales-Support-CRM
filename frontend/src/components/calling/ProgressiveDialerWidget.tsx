"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  PhoneCall,
  PhoneForwarded,
  CheckCircle2,
  Clock,
  Building,
  User,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

interface ProgressiveDialerWidgetProps {
  onLeadProcessed?: () => void;
  className?: string;
}

export function ProgressiveDialerWidget({ onLeadProcessed, className }: ProgressiveDialerWidgetProps) {
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [isSavingOutcome, setIsSavingOutcome] = useState(false);

  // Disposition Form
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Interested');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>('Contacted');
  const [callNotes, setCallNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  // Pacing Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch the next lead assigned to this user from active campaigns
  const fetchNextLead = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/campaigns/active-feed/my-next');
      if (res.data.success && res.data.data) {
        setCurrentLead(res.data.data);
        setSelectedOutcome('Interested');
        setSelectedLeadStatus('Contacted');
        setCallNotes('');
        setFollowUpDate('');
        setTimerSeconds(30);
        setIsTimerRunning(true);
      } else {
        setCurrentLead(null);
        setIsTimerRunning(false);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextLead();
  }, [fetchNextLead]);

  // Pacing countdown logic
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timerSeconds]);

  // Trigger outbound call
  const handleInitiateCall = async () => {
    if (!currentLead?.phone) return;
    setIsCalling(true);
    setIsTimerRunning(false);
    try {
      await api.post('/calls/click-to-call', {
        destinationNumber: currentLead.phone,
        leadId: currentLead.lead_id,
      });
      toast.success(`Calling ${currentLead.first_name} (${currentLead.phone}). Pick up your extension to bridge.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to connect telephony bridge');
    } finally {
      setIsCalling(false);
    }
  };

  // Submit Call Outcome & Advance to Next Lead
  const handleSubmitOutcome = async () => {
    if (!currentLead) return;
    setIsSavingOutcome(true);
    try {
      const payload = {
        contactId: currentLead.contact_id,
        leadId: currentLead.lead_id,
        callOutcome: selectedOutcome,
        leadStatus: selectedLeadStatus,
        notes: callNotes,
        followUpDate: followUpDate || undefined,
      };

      const res = await api.post('/campaigns/active-feed/outcome', payload);
      if (res.data.success) {
        toast.success(`Lead outcome saved! Fetching next lead...`);
        if (onLeadProcessed) onLeadProcessed();
        fetchNextLead();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save outcome');
    } finally {
      setIsSavingOutcome(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={`border shadow-xs ${className}`}>
        <CardContent className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 animate-spin text-primary" /> Loading active progressive dial queue...
        </CardContent>
      </Card>
    );
  }

  if (!currentLead) {
    return (
      <Card className={`border shadow-xs bg-gradient-to-r from-muted/20 to-card ${className}`}>
        <CardContent className="p-6 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Dialer Queue All Caught Up!</h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
              You currently have no pending leads in active campaigns. When new campaigns or leads are auto-assigned to you, they will appear here automatically.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchNextLead} className="h-8 text-xs gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Check For New Leads
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border shadow-sm border-primary/30 bg-card overflow-hidden ${className}`}>
      {/* Header with campaign and timer */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-bold text-xs text-foreground">
            Progressive Campaign Lead: <span className="text-primary">{currentLead.campaign_name}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-background border shadow-2xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className={timerSeconds <= 5 ? 'text-destructive font-bold' : 'text-foreground'}>
              Auto-dial in: 00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="p-1 rounded-md hover:bg-background/80 text-muted-foreground"
            title={isTimerRunning ? 'Pause auto timer' : 'Resume auto timer'}
          >
            {isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-primary" />}
          </button>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Lead Profile Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-foreground">
                {currentLead.first_name} {currentLead.last_name || ''}
              </span>
              <StatusBadge status={currentLead.lead_status || 'New'} />
              {currentLead.priority && (
                <Badge variant="outline" className="text-[10px] font-semibold">{currentLead.priority}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {currentLead.company || 'Private Client'}
              </span>
              <span className="flex items-center gap-1 font-mono font-semibold text-foreground">
                <PhoneCall className="h-3.5 w-3.5 text-primary" /> {currentLead.phone}
              </span>
              {currentLead.email && <span>{currentLead.email}</span>}
            </div>
          </div>

          <Button
            onClick={handleInitiateCall}
            disabled={isCalling}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 gap-2 shadow-xs shrink-0"
          >
            <PhoneForwarded className="h-4 w-4" />
            {isCalling ? 'Connecting Call...' : 'Call Customer Now'}
          </Button>
        </div>

        {/* Post-Call Outcome and Status Update Section */}
        <div className="space-y-3 pt-1">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Log Call Outcome & Maintain Lead Status:
          </Label>

          {/* Quick Outcome Dispositions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Interested', status: 'Interested', color: 'border-blue-500/40 hover:bg-blue-500/10' },
              { label: 'Follow-up Required', status: 'Follow-up', color: 'border-amber-500/40 hover:bg-amber-500/10' },
              { label: 'Converted to Deal', status: 'Converted', color: 'border-emerald-500/40 hover:bg-emerald-500/10' },
              { label: 'Busy / Unreachable', status: 'Contacted', color: 'border-zinc-400/40 hover:bg-zinc-500/10' },
              { label: 'Wrong Number', status: 'Lost', color: 'border-rose-400/40 hover:bg-rose-500/10' },
              { label: 'Not Interested', status: 'Lost', color: 'border-red-500/40 hover:bg-red-500/10' },
            ].map((d) => {
              const isSelected = selectedOutcome === d.label;
              return (
                <button
                  type="button"
                  key={d.label}
                  onClick={() => {
                    setSelectedOutcome(d.label);
                    setSelectedLeadStatus(d.status);
                  }}
                  className={`p-2 rounded-lg border text-xs font-semibold text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                      : `bg-card border-border text-foreground ${d.color}`
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Follow-up date if selected */}
          {selectedOutcome === 'Follow-up Required' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
              <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Next Scheduled Follow-up Date & Time:
              </Label>
              <Input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Call Discussion Notes:</Label>
            <Input
              placeholder="e.g. Discussed pricing package B, client requested demo on Friday"
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Advance Action */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Updating status to: <span className="font-bold text-foreground">{selectedLeadStatus}</span>
            </span>

            <Button
              size="sm"
              onClick={handleSubmitOutcome}
              isLoading={isSavingOutcome}
              className="font-bold gap-1.5 h-9"
            >
              Save Outcome & Dial Next Lead <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

