import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"
import { registerSchema } from "@/lib/validations"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 1. Validar datos
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      )
    }

    // OJO: Si en el form usaste "name", asegúrate que el schema lo mapee a "username"
    // o cámbialo aquí según lo que diga tu registerSchema
    const { email, password, username } = result.data

    // 2. Verificar si existe
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      )
    }

    // 3. Crear usuario y OBTENER el ID generado por Postgres
    const hashedPassword = await hashPassword(password)

    const insertedRows = await sql`
      INSERT INTO users (email, password_hash, username)
      VALUES (${email.toLowerCase()}, ${hashedPassword}, ${username})
      RETURNING id
    `

    const userId = insertedRows[0].id

    // Crea el objeto usuario para la sesión
    const userForSession = {
      id: userId,
      username: username, // el que viene del body
      email: email.toLowerCase(),
    }

    const response = NextResponse.json({ success: true, userId })
    // Pasar el objeto completo
    await createSession(userForSession)

    return response
  } catch (error: any) {
    // ESTO ES VITAL: Mira tu terminal donde corre Next.js (npm run dev)
    // El error real aparecerá ahí detallado.
    console.error("--- DETALLE DEL ERROR EN EL SERVIDOR ---")
    console.error(error)

    return NextResponse.json(
      { error: error.message || "An error occurred during registration" },
      { status: 500 },
    )
  }
}
