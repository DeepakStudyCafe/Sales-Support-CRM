"use client";

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Palette, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [accent, setAccent] = useState('blue');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Crisp white canvas with dark high-contrast typography',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep zinc tones reducing eye fatigue in dim lighting',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Automatically aligns with your operating system settings',
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Interface Theme & Appearance"
        subtitle="Customize light and dark appearance, color accents, and display typography"
        breadcrumbs={[
          { label: 'Settings', href: '/settings/general' },
          { label: 'Theme Settings' },
        ]}
      />

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Visual Theme Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    toast.success(`Theme set to ${t.label}`);
                  }}
                  className={`cursor-pointer rounded-lg border p-4 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-md bg-muted">
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
                    onClick={() => {
                      setAccent(acc.id);
                      toast.success(`Accent color updated`);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors ${
                      isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${acc.color} shrink-0`} />
                    <span className="truncate font-medium">{acc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

