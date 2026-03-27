import { z } from "zod"

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be at most 50 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(100, "Group name must be at most 100 characters"),
  description: z.string().optional(),
})

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
})

export const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  slots: z.array(z.boolean()), // Array de 24 o 48 posiciones según tus intervalos
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type JoinGroupInput = z.infer<typeof joinGroupSchema>
export type AvailabilityInput = z.infer<typeof availabilitySchema>
