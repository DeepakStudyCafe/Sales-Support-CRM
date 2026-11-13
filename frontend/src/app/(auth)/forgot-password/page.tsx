"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { authService } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setIsSubmitted(true);
    } catch {
      setError('Failed to process password reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl border-border/80">
      <CardHeader className="space-y-1 text-center pb-6">
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Reset Password
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Enter your registered email address to receive password reset instructions
        </CardDescription>
      </CardHeader>

      {isSubmitted ? (
        <CardContent className="space-y-4 text-center py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">Reset Link Sent</h4>
          <p className="text-xs text-muted-foreground">
            If an account exists with <strong className="text-foreground">{email}</strong>, we have
            sent instructions to reset your password.
          </p>
          <div className="pt-2">
            <Link href="/login" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/15 p-3 text-xs font-medium text-destructive border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full h-10 font-semibold" isLoading={isLoading}>
              Send Reset Instructions
            </Button>
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

