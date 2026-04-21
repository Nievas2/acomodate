import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { email, password } = body

    // 1. Buscamos TODOS los campos necesarios para la sesión (incluyendo username y email)
    const users = await sql`
      SELECT id, username, email, password_hash 
      FROM users 
      WHERE email = ${email.toLowerCase()}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Correo o contraseña invalida" },
        { status: 401 },
      )
    }

    const user = users[0]
    
    // 2. Verificamos la contraseña
    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { error: "Correo o contraseña invalida" },
        { status: 401 },
      )
    }

    // 3. Ahora 'user' tiene: id, username, email. 
    // Es el objeto perfecto para createSession.
    await createSession({
      id: user.id,
      username: user.username,
      email: user.email
    })

    // 4. Devolvemos una respuesta limpia (no envíes el hash de la contraseña al frontend por seguridad)
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      } 
    })

  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 },
    )
  }
}