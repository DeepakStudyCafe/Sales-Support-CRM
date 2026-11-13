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
import { ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CreateTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'Medium',
    customerId: '',
    assignedTo: '',
  });

  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, userRes, custRes] = await Promise.all([
          api.get('/tickets/categories/all'),
          api.get('/users?limit=100'),
          api.get('/customers?limit=100'),
        ]);
        if (catRes.data.success && catRes.data.data) setCategories(catRes.data.data);
        if (userRes.data.success && userRes.data.data) setUsers(userRes.data.data);
        if (custRes.data.success && custRes.data.data) setCustomers(custRes.data.data);
      } catch {
        // Ignored
      }
    }
    loadMeta();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setIsLoading(true);
    try {
      const res = await api.post('/tickets', {
        title: formData.title,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        priority: formData.priority,
        customerId: formData.customerId || undefined,
        assignedTo: formData.assignedTo || undefined,
      });

      if (res.data.success) {
        toast.success(`Ticket ${res.data.data.ticketNumber} created successfully`);
        router.push(`/tickets/${res.data.data.id}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create ticket');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-16">
      <PageHeader
        title="Create Support Ticket"
        subtitle="Log customer issue, set priority and calculate SLA response & resolution deadlines"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'Create Ticket' },
        ]}
        actions={
          <Link href="/tickets">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Tickets
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ticket Information</CardTitle>
            <CardDescription className="text-xs">
              Specify problem details, category classification, and assignment
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tTitle" required>
                Ticket Subject
              </Label>
              <Input
                id="tTitle"
                placeholder="e.g. Inability to access API dashboard from remote office"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ticket Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, categoryId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority (Affects SLA)</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low Priority (72h SLA)</SelectItem>
                    <SelectItem value="Medium">Medium Priority (24h SLA)</SelectItem>
                    <SelectItem value="High">High Priority (8h SLA)</SelectItem>
                    <SelectItem value="Urgent">Urgent Priority (4h SLA)</SelectItem>
                    <SelectItem value="Critical">Critical Priority (2h SLA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer / Client</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, customerId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Associate Customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name || ''} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assign Support Specialist</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign Specialist..." />
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
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="tDesc">Detailed Issue Description</Label>
              <Textarea
                id="tDesc"
                rows={4}
                placeholder="Include steps to reproduce, client contact notes, error codes..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t p-4 bg-muted/20">
            <Link href="/tickets">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isLoading} className="font-semibold">
              Open Ticket
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

