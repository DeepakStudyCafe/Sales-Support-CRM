"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Maximize2,
  Minimize2,
  Radio,
  Copy,
  ExternalLink,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface ProgressiveDialerWidgetProps {
  onLeadProcessed?: () => void;
  className?: string;
}

export function ProgressiveDialerWidget({ onLeadProcessed, className }: ProgressiveDialerWidgetProps) {
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [isSavingOutcome, setIsSavingOutcome] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Disposition Form
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Interested');
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>('Contacted');
  const [callNotes, setCallNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  // Pacing Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLeadIdRef = useRef<string | null>(null);

  // Fetch the next lead assigned to this user from active campaigns
  const fetchNextLead = useCallback(async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      const res = await api.get('/campaigns/active-feed/my-next');
      if (res.data.success && res.data.data) {
        const lead = res.data.data;
        const isNewLead = lead.contact_id !== lastLeadIdRef.current;
        lastLeadIdRef.current = lead.contact_id;

        setCurrentLead(lead);
        setSelectedOutcome('Interested');
        setSelectedLeadStatus('Contacted');
        setCallNotes('');
        setFollowUpDate('');
        setTimerSeconds(30);
        setIsTimerRunning(true);

        // Auto-open caller popup modal when a lead is ready
        if (isNewLead) {
          setIsModalOpen(true);
        }
      } else {
        setCurrentLead(null);
        setIsTimerRunning(false);
        lastLeadIdRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNextLead(true);
  }, [fetchNextLead]);

  // Periodic Polling: Every 10 seconds check for active campaign leads if none currently active
  useEffect(() => {
    if (currentLead) return; // Don't interrupt while agent has an active lead card

    const interval = setInterval(() => {
      fetchNextLead(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentLead, fetchNextLead]);

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
      toast.success(`Click-to-Call initiated for ${currentLead.first_name} (${currentLead.phone})! Pick up your IVR extension to bridge.`);
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
        fetchNextLead(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save outcome');
    } finally {
      setIsSavingOutcome(false);
    }
  };

  const copyPhoneToClipboard = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success(`Copied ${phone} to clipboard`);
  };

  // Shared caller disposition & details body
  const renderDialerBody = (isModal: boolean = false) => (
    <div className="space-y-4">
      {/* Lead Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg text-foreground">
              {currentLead.first_name} {currentLead.last_name || ''}
            </span>
            <StatusBadge status={currentLead.lead_status || 'New'} />
            {currentLead.priority && (
              <Badge variant="outline" className="text-[10px] font-semibold">{currentLead.priority}</Badge>
            )}
            {currentLead.calling_window_start && (
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1">
                <Clock className="h-3 w-3" /> Window: {currentLead.calling_window_start} - {currentLead.calling_window_end}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {currentLead.company && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {currentLead.company}
              </span>
            )}
            <div className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded-md border font-mono font-bold text-sm text-foreground">
              <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
              <span>{currentLead.phone}</span>
              <button
                type="button"
                onClick={() => copyPhoneToClipboard(currentLead.phone)}
                className="text-muted-foreground hover:text-foreground ml-1"
                title="Copy Phone"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            {currentLead.email && <span>{currentLead.email}</span>}
            {currentLead.city && <span>• {currentLead.city}, {currentLead.state}</span>}
            {currentLead.assigned_agent_name && (
              <span className="text-primary font-medium">
                • Agent: {currentLead.assigned_agent_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleInitiateCall}
            disabled={isCalling}
            size="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 gap-2 shadow-sm text-sm"
          >
            <PhoneForwarded className="h-4 w-4" />
            {isCalling ? 'Connecting Call...' : 'Call Customer Now'}
          </Button>

          {!isModal && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 text-muted-foreground"
              onClick={() => setIsModalOpen(true)}
              title="Open Calling Popup Window"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
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
                className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary'
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
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 animate-in fade-in">
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
          <Label className="text-xs font-semibold">Call Discussion Notes / Remarks:</Label>
          <Input
            placeholder="e.g. Discussed pricing package B, client requested demo on Friday"
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Advance Action */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            Lead Status: <span className="font-bold text-foreground">{selectedLeadStatus}</span>
          </span>

          <div className="flex items-center gap-2">
            {isModal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-muted-foreground gap-1"
              >
                <Minimize2 className="h-3.5 w-3.5" /> Minimize to Dashboard
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSubmitOutcome}
              disabled={isSavingOutcome}
              className="font-bold gap-1.5 h-9 bg-primary text-primary-foreground"
            >
              {isSavingOutcome ? 'Saving...' : 'Save Outcome & Next Lead'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className={`border shadow-xs ${className}`}>
        <CardContent className="p-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
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
            <div className="flex items-center justify-center gap-2">
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <h4 className="font-bold text-sm text-foreground">Progressive Dialer Queue Ready</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              No pending leads currently in active calling windows. When an outbound campaign calling window is active, the caller popup window will appear automatically on your screen. (Auto-polling every 10s)
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => fetchNextLead(true)} className="h-8 text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Refresh Dialer Queue
            </Button>
            <Link href="/calling/dialer">
              <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-primary" /> Open Dedicated Dialer Console
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* 1. In-Page Dashboard Widget */}
      <Card className={`border shadow-md border-primary/40 bg-card overflow-hidden ring-1 ring-primary/20 ${className}`}>
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

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-6 px-2 text-[11px] font-semibold text-primary gap-1 ml-1"
            >
              <Maximize2 className="h-3 w-3" /> Popup Window
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {renderDialerBody(false)}
        </CardContent>
      </Card>

      {/* 2. Floating Calling Popup Modal (Displays right on the agent's screen when lead arrives) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between pr-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <DialogTitle className="text-base font-bold text-foreground">
                  Calling Window: {currentLead.campaign_name}
                </DialogTitle>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted">
                <Clock className="h-3 w-3 text-primary" />
                <span>00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}</span>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground text-left mt-0.5">
              Outbound Progressive Dialer queue is active. Review client details and initiate Click-to-Call.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            {renderDialerBody(true)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
