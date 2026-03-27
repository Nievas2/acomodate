"use client"

import { useRouter, useSearchParams } from "next/navigation"
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
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
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
      confirmPassword: "",
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
        router.push(callbackUrl || '/dashboard')
    },
  })

  const onSubmit = handleSubmit((data) => {
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
            <span className="font-bold text-2xl">Acomodate</span>
          </Link>
          <h1 className="text-2xl font-semibold mt-6">
            {mode === "login" ? "Bienvenido de nuevo" : "Crear una cuenta"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "login"
              ? "Inicia sesión para gestionar tus grupos y disponibilidad."
              : "Comience a programar reuniones grupales gratis."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="plastic-surface p-6 space-y-5">
          {mutationError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {mutationError instanceof Error
                ? mutationError.message
                : "Ocurrio un error"}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input
                placeholder="John Doe"
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
            <Label htmlFor="password">Contraseña</Label>
            <Input
              type="password"
              placeholder="**********"
              className={`plastic-input ${errors.password ? "border-destructive" : ""}`}
              {...formRegister("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message as string}
              </p>
            )}
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                type="password"
                placeholder="**********"
                className={`plastic-input ${errors.confirmPassword ? "border-destructive" : ""}`}
                {...formRegister("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message as string}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full plastic-button"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "login" ? "Iniciando sesión..." : "Registrando..."}
              </>
            ) : mode === "login" ? (
              "Iniciar sesión"
            ) : (
              "Registrarse"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {"¿No tienes una cuenta? "}
              <Link href="/register" className="text-primary hover:underline">
                Registrate
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
