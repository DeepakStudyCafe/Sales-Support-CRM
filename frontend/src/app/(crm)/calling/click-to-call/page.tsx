"use client";

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, PhoneCall, PhoneOff, CheckCircle, AlertCircle, Clock, Volume2 } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function ClickToCallPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [didNumber, setDidNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Disposition
  const [disposition, setDisposition] = useState('Interested');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSavingDisposition, setIsSavingDisposition] = useState(false);

  const dialPadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const handleDigitClick = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Please enter a destination phone number');
      return;
    }

    setIsCalling(true);
    try {
      const res = await api.post('/calls/click-to-call', {
        customerPhone: phoneNumber,
        did: didNumber || 'DEFAULT_DID',
      });

      if (res.data.success) {
        toast.success('Call initiated via IVR Solutions bridge!');
        setActiveCallId(res.data.data.callId);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Call failed. Verify IVR agent extension in settings.');
    } finally {
      setIsCalling(false);
    }
  };

  const handleSaveDisposition = async () => {
    if (!activeCallId) return;
    setIsSavingDisposition(true);
    try {
      const res = await api.post(`/calls/${activeCallId}/disposition`, {
        disposition,
        notes: dispositionNotes,
        followUpRequired,
        followUpDatetime: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      });

      if (res.data.success) {
        toast.success('Call disposition and follow-up saved');
        setActiveCallId(null);
        setPhoneNumber('');
        setDispositionNotes('');
        setFollowUpDate('');
        setFollowUpRequired(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save disposition');
    } finally {
      setIsSavingDisposition(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <PageHeader
        title="Click-to-Call Dialer"
        subtitle="Place direct outbound telephony calls through official IVR Solutions bridge"
        breadcrumbs={[
          { label: 'Calling & IVR', href: '/calling/history' },
          { label: 'Click-to-Call' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dialer Pad */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-emerald-600" /> Dial Number
            </CardTitle>
            <CardDescription className="text-xs">
              Enter phone number with standard 10-digit format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInitiateCall} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dialPhone" className="text-xs font-semibold">
                  Customer Phone Number
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="dialPhone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="h-11 text-base font-semibold tracking-wider text-center"
                    required
                  />
                  {phoneNumber && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhoneNumber('')}
                      className="text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Virtual Dialpad */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {dialPadDigits.map((digit) => (
                  <Button
                    key={digit}
                    type="button"
                    variant="outline"
                    onClick={() => handleDigitClick(digit)}
                    className="h-11 text-base font-bold hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {digit}
                  </Button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="didSelect" className="text-xs">
                  Company Caller ID / DID (Optional)
                </Label>
                <Input
                  id="didSelect"
                  value={didNumber}
                  onChange={(e) => setDidNumber(e.target.value)}
                  placeholder="Defaults to assigned extension DID"
                  className="h-9 text-xs"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-sm shadow-md"
                isLoading={isCalling}
              >
                <Phone className="h-4 w-4" /> Connect Bridge Call
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Post-Call Disposition Form */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> Call Disposition & Feedback
            </CardTitle>
            <CardDescription className="text-xs">
              Log conversation outcome, notes, and schedule automated callback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCallId ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Call session active. Complete disposition below when done.</span>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Dial a customer to activate the disposition logger, or record feedback for the latest call.
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Call Outcome</Label>
              <Select value={disposition} onValueChange={setDisposition}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Not Interested">Not Interested</SelectItem>
                  <SelectItem value="No Answer">No Answer</SelectItem>
                  <SelectItem value="Busy">Busy</SelectItem>
                  <SelectItem value="Call Back Required">Call Back Required</SelectItem>
                  <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
                  <SelectItem value="Converted">Converted to Client</SelectItem>
                  <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                  <SelectItem value="Voicemail">Voicemail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Call Summary & Discussion Notes</Label>
              <Textarea
                rows={3}
                placeholder="Key talking points, client feedback, price objections..."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fuReq"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="fuReq" className="text-xs font-medium cursor-pointer">
                  Schedule automated callback task
                </Label>
              </div>

              {followUpRequired && (
                <div className="space-y-1 pt-1">
                  <Label htmlFor="fuTime" className="text-xs">
                    Callback Date & Time (IST)
                  </Label>
                  <Input
                    id="fuTime"
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>

            <Button
              className="w-full h-10 font-semibold"
              disabled={!activeCallId}
              onClick={handleSaveDisposition}
              isLoading={isSavingDisposition}
            >
              Save Call Outcome & Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

