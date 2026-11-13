"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Plus, Tag, Check, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function TicketCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New category form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('Medium');

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets/categories/all');
      if (res.data.success && res.data.data) {
        setCategories(res.data.data);
      }
    } catch {
      toast.error('Failed to load ticket categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/tickets/categories', {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultPriority,
      });

      if (res.data.success) {
        toast.success('Category created successfully');
        setIsDialogOpen(false);
        setName('');
        setDescription('');
        setDefaultPriority('Medium');
        fetchCategories();
      }
    } catch {
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await api.patch(`/tickets/categories/${id}/toggle`);
      if (res.data.success) {
        toast.success('Category status updated');
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
        );
      }
    } catch {
      toast.error('Failed to update category status');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket Categories"
        subtitle="Manage categorization and default priorities for customer support tickets"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'Categories' },
        ]}
        actions={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No ticket categories found</p>
            <p className="text-sm">Create categories to organize and route customer support requests.</p>
          </div>
        ) : (
          categories.map((category) => (
            <Card key={category.id} className="relative overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    {category.name}
                  </CardTitle>
                </div>
                <Switch
                  checked={!!category.is_active}
                  onCheckedChange={() => handleToggleActive(category.id)}
                />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground text-xs min-h-[36px]">
                  {category.description || 'No description provided.'}
                </p>
                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Default Priority:</span>
                  <PriorityBadge priority={category.default_priority} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ticket Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Billing, Technical Support, Bug Report"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-desc">Description</Label>
              <Textarea
                id="category-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what inquiries belong in this category..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Default Priority</Label>
              <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

