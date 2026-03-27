import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createGroupSchema } from '@/lib/validations'
import { nanoid } from 'nanoid'

// Get all groups for the current user
export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const groups = await sql`
      SELECT 
        g.id, 
        g.name, 
        g.description, 
        g.invite_code,
        g.created_at,
        g.owner_id,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ${session.userId}
      ORDER BY g.created_at DESC
    `
    
    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

// Create a new group
export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const body = await request.json()
    const result = createGroupSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }
    
    const { name, description } = result.data
    // nanoid(8) está bien aquí porque invite_code es VARCHAR(8)
    const inviteCode = nanoid(8) 
    
    // 1. Crear el grupo y dejar que Postgres genere el UUID con RETURNING
    const insertedGroup = await sql`
      INSERT INTO groups (name, description, owner_id, invite_code)
      VALUES (${name}, ${description || null}, ${session.userId}, ${inviteCode})
      RETURNING id
    `
    
    const groupId = insertedGroup[0].id

    // 2. Añadir al creador como miembro (le asignamos rol 'admin')
    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${session.userId}, 'admin')
    `
    
    // 3. Obtener el grupo creado para devolverlo
    const newGroup = await sql`
      SELECT id, name, description, invite_code, created_at, owner_id
      FROM groups WHERE id = ${groupId}
    `
    
    return NextResponse.json({ group: newGroup[0] }, { status: 201 })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}