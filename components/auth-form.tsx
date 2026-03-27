"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, registerSchema } from "@/lib/validations"
import { useMutation } from "@tanstack/react-query"

interface AuthFormProps {
  mode: "login" | "register"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const { login, register } = useAuth()

  const {
    register: formRegister,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  })

  const {
    mutate,
    isPending,
    error: mutationError,
  } = useMutation({
    mutationFn: async (data: any) => {
      if (mode === "login") {
        return await login(data.email, data.password)
      } else {
        return await register(data.email, data.password, data.username)
      }
    },
    onSuccess: () => {
      reset()
      router.push("/dashboard")
    },
  })

  const onSubmit = handleSubmit((data) => {
    console.log(data)
    mutate(data)
  })

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl">SyncUp</span>
          </Link>
          <h1 className="text-2xl font-semibold mt-6">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "login"
              ? "Sign in to manage your groups and availability"
              : "Get started with free group scheduling"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="plastic-surface p-6 space-y-5">
          {mutationError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {mutationError instanceof Error
                ? mutationError.message
                : "An error occurred"}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="username">Name</Label>
              <Input
                placeholder="Your name"
                className={`plastic-input ${errors.username ? "border-destructive" : ""}`}
                {...formRegister("username")}
              />
              {errors.username && (
                <p className="text-xs text-destructive">
                  {errors.username.message as string}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              placeholder="you@example.com"
              className={`plastic-input ${errors.email ? "border-destructive" : ""}`}
              {...formRegister("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              className={`plastic-input ${errors.password ? "border-destructive" : ""}`}
              {...formRegister("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message as string}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full plastic-button"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {"Don't have an account? "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
