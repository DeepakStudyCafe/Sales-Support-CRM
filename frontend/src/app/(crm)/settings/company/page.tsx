"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CompanySettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: 'Acme Enterprise Solutions Pvt. Ltd.',
    gstin: '07AAAAA0000A1Z5',
    support_email: 'support@company.com',
    support_phone: '+91 11 4000 5000',
    website: 'https://company.com',
    address: 'DLF Cyber City, Tower B, 10th Floor, Gurugram, Haryana - 122002',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'company' } });
        if (res.data.success && res.data.data) {
          const map: Record<string, string> = {};
          res.data.data.forEach((s: any) => {
            map[s.key] = s.value;
          });
          setFormData((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // use defaults
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/settings/company', formData);
      if (res.data.success) {
        toast.success('Company profile updated successfully');
      }
    } catch {
      toast.error('Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Company Profile"
        subtitle="Manage corporate entity identity, GST compliance details, and customer contact information"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'Company' },
        ]}
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Corporate Entity Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Company Legal Name *</Label>
                <Input
                  id="c-name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN / Tax Identification</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="support_email">Official Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support_phone">Support Hotline Number</Label>
                <Input
                  id="support_phone"
                  value={formData.support_phone}
                  onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website Address</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Registered Corporate Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving Profile...' : 'Save Company Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

