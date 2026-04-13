// app/api/groups/[id]/subgroups/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createSubgroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1),
})

// GET — devuelve todos los subgrupos del grupo con sus miembros
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

    const membership = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `
    if (membership.length === 0) {
      return NextResponse.json({ error: 'No sos miembro de este grupo' }, { status: 403 })
    }

    // Subgrupos con sus miembros en un solo query
    const subgroups = await sql`
      SELECT
        s.id,
        s.name,
        s.created_by,
        s.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'name', u.username)
            ORDER BY u.username
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS members
      FROM subgroups s
      LEFT JOIN subgroup_members sm ON sm.subgroup_id = s.id
      LEFT JOIN users u ON u.id = sm.user_id
      WHERE s.group_id = ${id}
      GROUP BY s.id, s.name, s.created_by, s.created_at
      ORDER BY s.created_at ASC
    `

    return NextResponse.json({ subgroups })
  } catch (error) {
    console.error('Error al obtener subgrupos:', error)
    return NextResponse.json({ error: 'Ocurrió un error' }, { status: 500 })
  }
}

// POST — crea un subgrupo (solo admin/owner)
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

    // Solo el admin/owner puede crear subgrupos
    const membership = await sql`
      SELECT role FROM group_members
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `
    if (membership.length === 0) {
      return NextResponse.json({ error: 'No sos miembro de este grupo' }, { status: 403 })
    }
    if (membership[0].role !== 'admin') {
      return NextResponse.json({ error: 'Solo el administrador puede crear subgrupos' }, { status: 403 })
    }

    const body = await request.json()
    const result = createSubgroupSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { name, memberIds } = result.data

    // Verificar que todos los memberIds son miembros del grupo padre
    const validMembers = await sql`
      SELECT user_id FROM group_members
      WHERE group_id = ${id} AND user_id = ANY(${memberIds}::uuid[])
    `
    if (validMembers.length !== memberIds.length) {
      return NextResponse.json({ error: 'Algunos usuarios no pertenecen al grupo' }, { status: 400 })
    }

    // Crear el subgrupo
    const inserted = await sql`
      INSERT INTO subgroups (group_id, name, created_by)
      VALUES (${id}, ${name}, ${session.userId})
      RETURNING id, name, created_by, created_at
    `
    const subgroupId = inserted[0].id

    // Insertar miembros
    for (const userId of memberIds) {
      await sql`
        INSERT INTO subgroup_members (subgroup_id, user_id)
        VALUES (${subgroupId}, ${userId})
        ON CONFLICT DO NOTHING
      `
    }

    return NextResponse.json({ subgroup: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('Error al crear subgrupo:', error)
    return NextResponse.json({ error: 'Ocurrió un error' }, { status: 500 })
  }
}

// DELETE — elimina un subgrupo (solo admin/owner)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const membership = await sql`
      SELECT role FROM group_members
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return NextResponse.json({ error: 'Solo el administrador puede eliminar subgrupos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const subgroupId = searchParams.get('subgroupId')
    if (!subgroupId) {
      return NextResponse.json({ error: 'Falta subgroupId' }, { status: 400 })
    }

    await sql`
      DELETE FROM subgroups
      WHERE id = ${subgroupId} AND group_id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar subgrupo:', error)
    return NextResponse.json({ error: 'Ocurrió un error' }, { status: 500 })
  }
}