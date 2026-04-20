import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id } = await params
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Check if user is a member
    const membership = await sql`
      SELECT 1 FROM group_members 
      WHERE group_id = ${id} AND user_id = ${session.userId}
    `
    
    if (membership.length === 0) {
      return NextResponse.json(
        { error: 'Not a member of this group' },
        { status: 403 }
      )
    }
    
    // Get group details
    const groups = await sql`
      SELECT 
        g.id, 
        g.name, 
        g.description, 
        g.invite_code,
        g.created_at,
        g.owner_id
      FROM groups g
      WHERE g.id = ${id}
    `
    
    if (groups.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }
    
    // Get members (CORREGIDO: u.username y gm.created_at)
    // Usamos u.username AS name por si tu frontend espera la propiedad 'name'
    const members = await sql`
      SELECT u.id, u.username AS name, u.email
      FROM users u
      INNER JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ${id}
      ORDER BY gm.created_at ASC
    `
    
    return NextResponse.json({ 
      group: groups[0],
      members
    })
  } catch (error) {
    console.error('Get group error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
 
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id } = await params
 
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
 
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')
 
    // ── Eliminar un miembro (admin only) ──────────────────────────────────────
    if (targetUserId) {
      // Verificar que el que pide es admin/owner
      const requester = await sql`
        SELECT role FROM group_members
        WHERE group_id = ${id} AND user_id = ${session.userId}
      `
      if (requester.length === 0) {
        return NextResponse.json({ error: 'Not a member' }, { status: 403 })
      }
 
      const group = await sql`SELECT owner_id FROM groups WHERE id = ${id}`
      if (group.length === 0) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
 
      const isAdmin = requester[0].role === 'admin' || group[0].owner_id === session.userId
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
      }
 
      // No se puede eliminar al owner
      if (targetUserId === group[0].owner_id) {
        return NextResponse.json({ error: 'Cannot remove the group owner' }, { status: 400 })
      }
 
      // Eliminar de group_members (availability se borra por CASCADE en group_id+user_id
      // pero aquí lo hacemos explícito para limpiar también subgroup_members)
      await sql`
        DELETE FROM subgroup_members
        WHERE user_id = ${targetUserId}
          AND subgroup_id IN (SELECT id FROM subgroups WHERE group_id = ${id})
      `
      await sql`
        DELETE FROM availability
        WHERE user_id = ${targetUserId} AND group_id = ${id}
      `
      await sql`
        DELETE FROM group_members
        WHERE group_id = ${id} AND user_id = ${targetUserId}
      `
 
      return NextResponse.json({ success: true })
    }
 
    // ── Eliminar el grupo completo (solo owner) ───────────────────────────────
    const groups = await sql`SELECT owner_id FROM groups WHERE id = ${id}`
    if (groups.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    if (groups[0].owner_id !== session.userId) {
      return NextResponse.json({ error: 'Only the group owner can delete this group' }, { status: 403 })
    }
 
    await sql`DELETE FROM groups WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}