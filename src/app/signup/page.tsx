"use client";

import { useState } from "react";
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

const signupSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Enter a valid email"),
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
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupForm) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
      },
    });

    if (error) {
      setError("root", {
        message:
          error.message === "User already registered"
            ? "This email is already registered. Try logging in."
            : error.message,
      });
      return;
    }

    // Auto-confirm the user's email if no session was created
    if (!data.session && data.user) {
      try {
        const confirmRes = await fetch("/api/auth/auto-confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: data.user.id }),
          credentials: "include",
        });
        if (confirmRes.ok) {
          // Retry sign in after confirmation
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });
          
          if (signInError || !signInData.session) {
            setError("root", { message: "Account created but sign in failed. Please try logging in." });
            return;
          }
          // Update data.session for the sync check below
          data.session = signInData.session;
        }
      } catch (err) {
        console.error("Auto-confirm error:", err);
        setError("root", { message: "Account created but confirmation failed. Please try logging in." });
        return;
      }
    }

    if (data.session) {
      const syncRes = await fetch("/api/users/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!syncRes.ok) {
        setError("root", { message: "Something went wrong. Try logging in." });
        return;
      }
      router.push("/workspace");
    } else {
      // If still no session, redirect to login
      router.push("/login");
    }
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

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">Create your account</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Get started free. No credit card required.
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
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  aria-invalid={!!errors.full_name}
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">
                    {errors.full_name.message}
                  </p>
                )}
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Get Started Free"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
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
