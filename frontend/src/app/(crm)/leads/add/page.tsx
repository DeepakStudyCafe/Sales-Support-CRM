"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { leadService } from '@/services/lead.service';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AddLeadPage() {
  const router = useRouter();
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<any>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    alt_phone: '',
    email: '',
    company: '',
    source_id: '',
    status: 'New',
    priority: 'Medium',
    assigned_to: '',
    city: '',
    state: '',
    country: 'India',
    notes: '',
  });

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [srcRes, userRes] = await Promise.all([
          leadService.getSources(),
          api.get('/users?limit=100'),
        ]);
        if (srcRes.data.success && srcRes.data.data) {
          setSources(srcRes.data.data);
        }
        if (userRes.data.success && userRes.data.data) {
          setUsers(userRes.data.data);
        }
      } catch {
        // Ignored
      }
    }
    loadDropdowns();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (duplicateLead && (field === 'phone' || field === 'email')) {
      setDuplicateLead(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent, skipDuplicate = false) => {
    e.preventDefault();
    if (!formData.first_name || !formData.phone) {
      toast.error('First name and primary phone number are mandatory');
      return;
    }

    setIsLoading(true);
    setDuplicateLead(null);

    try {
      const payload: any = {
        ...formData,
        source_id: formData.source_id || undefined,
        assigned_to: formData.assigned_to || undefined,
        skipDuplicateCheck: skipDuplicate,
      };

      const res = await api.post('/leads', payload);

      if (res.data.success) {
        if (res.data.data?.duplicate) {
          setDuplicateLead(res.data.data.existingLead);
          toast.warning('Duplicate lead detected with matching phone or email');
        } else {
          toast.success('Lead created successfully');
          router.push('/leads');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title="Add New Lead"
        subtitle="Capture new potential customer enquiry and initiate sales workflow"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'All Leads', href: '/leads' },
          { label: 'Add Lead' },
        ]}
        actions={
          <Link href="/leads">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Leads
            </Button>
          </Link>
        }
      />

      {duplicateLead && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Potential Duplicate Lead Record Found
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                A lead with the same phone ({duplicateLead.phone}) or email ({duplicateLead.email})
                already exists: <strong>{duplicateLead.first_name} {duplicateLead.last_name}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 pl-7">
            <Link href={`/leads/${duplicateLead.id}`}>
              <Button size="sm" variant="outline" className="text-xs h-8">
                View Existing Lead
              </Button>
            </Link>
            <Button
              size="sm"
              variant="default"
              className="text-xs h-8"
              onClick={(e) => handleSubmit(e, true)}
              isLoading={isLoading}
            >
              Save Anyway (Ignore Duplicate)
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Contact & Personal Details</CardTitle>
            <CardDescription className="text-xs">
              Primary identification details and company affiliation
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" required>
                  First Name
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g. Rahul"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="e.g. Sharma"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" required>
                  Primary Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alt_phone">Alternate Phone</Label>
                <Input
                  id="alt_phone"
                  placeholder="e.g. +91 9876543211"
                  value={formData.alt_phone}
                  onChange={(e) => handleChange('alt_phone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rahul@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company">Company / Business Name</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp India"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Sales Pipeline & Assignment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Lead Source</Label>
                  <Select
                    value={formData.source_id}
                    onValueChange={(val) => handleChange('source_id', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Lead Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => handleChange('status', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => handleChange('priority', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label>Assigned Sales Agent</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(val) => handleChange('assigned_to', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City / Region</Label>
                  <Input
                    id="city"
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <div className="space-y-1.5">
                <Label htmlFor="notes">Initial Requirements & Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Record customer's requirements, budget or background..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t p-4 bg-muted/20">
            <Link href="/leads">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isLoading} className="font-semibold">
              Save Lead Record
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

