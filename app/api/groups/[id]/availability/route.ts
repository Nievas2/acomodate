import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

// Schema de validación inline (o importar desde validations.ts si lo tenés)
const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  slots: z.array(z.boolean()).length(24),
})

// GET — devuelve la disponibilidad de todos los miembros del grupo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar membresía
    const membership = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `
    if (membership.length === 0) {
      return NextResponse.json({ error: 'No sos miembro de este grupo' }, { status: 403 })
    }

    // Devolver disponibilidad de todos los miembros
    // La DB guarda day_of_week (0-6) y slots (boolean[24])
    const availability = await sql`
      SELECT
        a.user_id,
        u.username AS user_name,
        a.day_of_week,
        a.slots
      FROM availability a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.group_id = ${id}
      ORDER BY a.user_id, a.day_of_week
    `

    return NextResponse.json({ availability })
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return NextResponse.json({ error: 'Ocurrió un error' }, { status: 500 })
  }
}

// POST — guarda o actualiza la disponibilidad de un día para el usuario actual
// Body: { dayOfWeek: 0-6, slots: boolean[24] }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar membresía
    const membership = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `
    if (membership.length === 0) {
      return NextResponse.json({ error: 'No sos miembro de este grupo' }, { status: 403 })
    }

    const body = await request.json()
    const result = availabilitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { dayOfWeek, slots } = result.data

    // Upsert: si ya existe el registro para este usuario/grupo/día, lo actualiza
    await sql`
      INSERT INTO availability (group_id, user_id, day_of_week, slots)
      VALUES (${id}, ${session.userId}, ${dayOfWeek}, ${slots})
      ON CONFLICT (user_id, group_id, day_of_week)
      DO UPDATE SET
        slots = ${slots},
        updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al guardar disponibilidad:', error)
    return NextResponse.json({ error: 'Ocurrió un error' }, { status: 500 })
  }
}