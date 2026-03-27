import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { joinGroupSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const result = joinGroupSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { inviteCode } = result.data
    
    // Find group by invite code
    const groups = await sql`
      SELECT id, name FROM groups WHERE invite_code = ${inviteCode}
    `
    
    if (groups.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }
    
    const group = groups[0]
    
    // Check if already a member
    const existingMember = await sql`
      SELECT 1 FROM group_members 
      WHERE group_id = ${group.id} AND user_id = ${session.userId}
    `
    
    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 409 }
      )
    }
    
    // Add user to group
    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${group.id}, ${session.userId})
    `
    
    return NextResponse.json({ 
      success: true, 
      group: { id: group.id, name: group.name } 
    })
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
