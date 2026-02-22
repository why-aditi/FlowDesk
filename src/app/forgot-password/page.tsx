"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBrowserClient } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordForm) {
    const supabase = createBrowserClient();
    
    // Get the current origin for the redirect URL
    // This URL must be whitelisted in Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
    const redirectTo = `${window.location.origin}/reset-password`;

    // Try with redirectTo first
    let error = (await supabase.auth.resetPasswordForEmail(
      values.email,
      {
        redirectTo,
      }
    )).error;

    // If we get a 405/hook error, try without redirectTo (uses default from Supabase config)
    if (error && (error.message.includes("405") || error.message.includes("hook"))) {
      error = (await supabase.auth.resetPasswordForEmail(
        values.email
        // No redirectTo - will use default from Supabase project settings
      )).error;
    }

    if (error) {
      // Handle specific error cases
      let errorMessage = error.message;
      
      if (error.message.includes("405") || error.message.includes("hook")) {
        errorMessage = "Configuration error. Please add the redirect URL to your Supabase project: Authentication > URL Configuration > Redirect URLs. Add: " + redirectTo;
      } else if (error.message.includes("email")) {
        errorMessage = "Unable to send reset email. Please check your email address and try again.";
      }
      
      setError("root", {
        message: errorMessage,
      });
      return;
    }

    setIsSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="font-semibold text-lg text-foreground hover:text-muted-foreground transition-colors"
          >
            FlowDesk
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              {isSubmitted
                ? "Check your email for a password reset link."
                : "Enter your email address and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If an account with that email exists, we've sent you a password
                  reset link. Please check your inbox and follow the instructions
                  to reset your password.
                </p>
                <p className="text-xs text-muted-foreground">
                  Note: If you don't receive an email, check your spam folder or ensure the redirect URL is configured in your Supabase dashboard.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/login")}
                    className="w-full"
                  >
                    Back to login
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsSubmitted(false)}
                    className="w-full"
                  >
                    Send another email
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errors.root && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.root.message}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
