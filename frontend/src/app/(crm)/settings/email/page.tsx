"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Save, Shield } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function EmailSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    smtp_host: 'smtp.sendgrid.net',
    smtp_port: '587',
    smtp_user: 'apikey',
    smtp_pass: '••••••••••••••••',
    smtp_secure: true,
    from_name: 'CRM Notifications',
    from_email: 'notifications@crm.com',
    email_signature: 'Warm regards,\nCustomer Success Team\nEnterprise CRM Solutions',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings', { params: { category: 'email' } });
        if (res.data.success && res.data.data) {
          const map: Record<string, any> = {};
          res.data.data.forEach((s: any) => {
            if (s.value === 'true' || s.value === 'false') {
              map[s.key] = s.value === 'true';
            } else {
              map[s.key] = s.value;
            }
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
      const payload: Record<string, string> = {};
      Object.entries(formData).forEach(([k, v]) => {
        payload[k] = String(v);
      });

      const res = await api.put('/settings/email', payload);
      if (res.data.success) {
        toast.success('SMTP email configuration saved');
      }
    } catch {
      toast.error('Failed to save email settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Email & SMTP Settings"
        subtitle="Configure transactional mailer gateways, SMTP server authentication, and sender signatures"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'Email' },
        ]}
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> SMTP Gateway Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={formData.smtp_host}
                  onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com or smtp.sendgrid.net"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                  placeholder="587 or 465"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-user">SMTP Username / Key</Label>
                <Input
                  id="smtp-user"
                  value={formData.smtp_user}
                  onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass">SMTP Password / API Key</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={formData.smtp_pass}
                  onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Use TLS / SSL Encryption</Label>
                <p className="text-xs text-muted-foreground">Required for secure delivery over port 587 or 465</p>
              </div>
              <Switch
                checked={formData.smtp_secure}
                onCheckedChange={(val) => setFormData({ ...formData, smtp_secure: val })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="from-name">From Display Name</Label>
                <Input
                  id="from-name"
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="from-email">From Email Address</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <Label htmlFor="signature">Default Outbound Email Signature</Label>
              <Textarea
                id="signature"
                value={formData.email_signature}
                onChange={(e) => setFormData({ ...formData, email_signature: e.target.value })}
                rows={3}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Email Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

