"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Palette, Check, Save, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [accent, setAccent] = useState('blue');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read from localStorage
    const savedAccent = localStorage.getItem('crm_accent');
    if (savedAccent) {
      setAccent(savedAccent);
    }

    // Try fetching from backend
    api.get('/settings?category=theme')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data?.data)) {
          res.data.data.forEach((s: any) => {
            if (s.key === 'mode' && s.value) setTheme(s.value);
            if (s.key === 'accent' && s.value) {
              setAccent(s.value);
              localStorage.setItem('crm_accent', s.value);
            }
          });
        }
      })
      .catch(() => {});
  }, [setTheme]);

  const handleSelectTheme = (tId: string) => {
    setTheme(tId);
    localStorage.setItem('theme', tId);
    toast.success(`Theme mode set to ${tId.toUpperCase()}`);
  };

  const handleSelectAccent = (accId: string) => {
    setAccent(accId);
    localStorage.setItem('crm_accent', accId);
    toast.success(`Accent palette updated to ${accId}`);
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      await api.put('/settings/theme', {
        mode: theme || 'system',
        accent,
      });
      toast.success('Theme preferences saved successfully');
    } catch {
      toast.info('Preferences saved locally in your browser session');
    } finally {
      setIsSaving(false);
    }
  };

  const themes = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Crisp white canvas with dark high-contrast typography for bright environments',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep zinc tones reducing eye fatigue during intensive calling sessions',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Automatically aligns with your operating system light / dark schedules',
      icon: Laptop,
    },
  ];

  const accents = [
    { id: 'blue', name: 'Ocean Blue (Default)', color: 'bg-blue-600' },
    { id: 'emerald', name: 'Emerald Green', color: 'bg-emerald-600' },
    { id: 'violet', name: 'Royal Violet', color: 'bg-violet-600' },
    { id: 'amber', name: 'Warm Amber', color: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title="Interface Theme & Appearance"
        subtitle="Personalize light and dark appearance, color accents, and display typography"
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Theme Settings' },
        ]}
      />

      <Card className="border shadow-xs">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Visual Theme Mode
          </CardTitle>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Active: {mounted ? theme?.toUpperCase() || 'SYSTEM' : 'LOADING...'}
          </span>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((t) => {
              const isSelected = mounted && (theme === t.id || (!theme && t.id === 'system'));
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t.label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accent Color Palette
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {accents.map((acc) => {
                const isSelected = accent === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectAccent(acc.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors ${
                      isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${acc.color} shrink-0 shadow-xs`} />
                    <span className="truncate font-medium">{acc.name}</span>
                    {isSelected && <Check className="h-3 w-3 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              size="sm"
              className="gap-2 text-xs font-semibold bg-primary"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Theme Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
