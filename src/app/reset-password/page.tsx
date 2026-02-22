"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
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

const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters and include one lowercase letter, one uppercase letter, one number, and one special character (e.g. !@#$%).";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, PASSWORD_REQUIREMENTS)
      .refine(
        (p) => /[a-z]/.test(p),
        PASSWORD_REQUIREMENTS
      )
      .refine(
        (p) => /[A-Z]/.test(p),
        PASSWORD_REQUIREMENTS
      )
      .refine(
        (p) => /[0-9]/.test(p),
        PASSWORD_REQUIREMENTS
      )
      .refine(
        (p) => /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~]/.test(p),
        PASSWORD_REQUIREMENTS
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Check if we have a valid session/token from the reset link
    async function checkSession() {
      const supabase = createBrowserClient();
      
      // Extract token from URL hash (Supabase password reset links contain access_token in hash)
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1)); // Remove '#'
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");
      
      if (!accessToken || hash.length === 0 || type !== "recovery") {
        // No hash or wrong type means invalid or expired link
        setIsValidToken(false);
        return;
      }

      // Subscribe to auth state changes to reliably detect the new session
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          setIsValidToken(true);
          subscription.unsubscribe();
        }
      });

      // Perform proper recovery token exchange
      // Extract token_hash from the hash if available, otherwise use access_token
      try {
        const tokenHash = hashParams.get("token_hash") || accessToken;
        
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });

        if (verifyError) {
          // If verifyOtp fails, Supabase client automatically processes hash fragments when getSession is called
          // This is a fallback for cases where the token format differs
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          
          if (currentSession) {
            setIsValidToken(true);
            subscription.unsubscribe();
          } else {
            setIsValidToken(false);
            subscription.unsubscribe();
          }
          return;
        }

        // verifyOtp succeeded, check for session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        
        if (currentSession) {
          setIsValidToken(true);
          subscription.unsubscribe();
        }
      } catch (err) {
        setIsValidToken(false);
        subscription.unsubscribe();
      }
    }

    checkSession();
  }, []);

  async function onSubmit(values: ResetPasswordForm) {
    const supabase = createBrowserClient();

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setError("root", {
        message: error.message || "Failed to reset password. The link may have expired.",
      });
      return;
    }

    // Password updated successfully, redirect to login
    router.push("/login?reset=success");
  }

  if (isValidToken === null) {
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
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Verifying reset link...
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isValidToken === false) {
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
              <CardTitle className="text-2xl">Invalid or expired link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="w-full"
                >
                  Request new reset link
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link
                    href="/login"
                    className="font-medium text-foreground hover:underline"
                  >
                    Back to login
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
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
            <CardTitle className="text-2xl">Set new password</CardTitle>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errors.root && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.root.message}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="8+ chars, mixed case, number, symbol"
                    className="pr-9"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    className="pr-9"
                    aria-invalid={!!errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Resetting password…" : "Reset password"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
