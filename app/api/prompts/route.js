import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth.js'
import { resolveTeamContext } from '@/lib/team-request.js'
import { handleApiError } from '@/lib/handle-api-error.js'
import { getUserList } from '@/lib/user-service.js'
import { generateUUID } from '@/lib/utils'

function applyPromptFilters(query, { teamId, userId, tag, search, scope }) {
  let baseQuery

  if (scope === 'personal') {
    // Explicitly get personal prompts only
    baseQuery = query.is('team_id', null).eq('created_by', userId)
  } else if (scope === 'team' && teamId) {
    // Explicitly get team prompts only
    baseQuery = query.eq('team_id', teamId)
  } else {
    // Legacy behavior - maintain backward compatibility
    baseQuery = teamId
      ? query.eq('team_id', teamId)
      : query.or(`created_by.eq.${userId},user_id.eq.${userId}`)
  }

  let filteredQuery = baseQuery

  if (tag) {
    filteredQuery = filteredQuery.ilike('tags', `%${tag}%`)
  }

  if (search) {
    filteredQuery = filteredQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  return filteredQuery
}

export async function GET(request) {
  try {
    const userId = await requireUserId()
    const { teamId, supabase, teamService } = await resolveTeamContext(request, userId, {
      requireMembership: false,
      allowMissingTeam: true
    })

    if (teamId) {
      await teamService.requireMembership(teamId, userId)
    }

    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const scope = searchParams.get('scope') // 'personal', 'team', or undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = (page - 1) * limit

    // Validate scope parameter
    if (scope && !['personal', 'team'].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameter. Must be "personal" or "team"' },
        { status: 400 }
      )
    }

    // If scope is 'team', ensure teamId is provided
    if (scope === 'team' && !teamId) {
      return NextResponse.json(
        { error: 'Team scope requires a valid team context' },
        { status: 400 }
      )
    }

    const filters = { teamId, userId, tag, search, scope }

    const dataQuery = applyPromptFilters(
      supabase
        .from('prompts')
        .select('*'),
      filters
    )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const countQuery = applyPromptFilters(
      supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true }),
      filters
    )

    const [promptsResult, countResult] = await Promise.all([dataQuery, countQuery])

    if (promptsResult.error) {
      throw promptsResult.error
    }

    if (countResult.error) {
      throw countResult.error
    }

    let prompts = promptsResult.data || []

    // Enrich prompts with creator info if possible
    if (prompts.length > 0) {
      const userIds = Array.from(new Set(prompts.map(p => p.created_by).filter(Boolean)))

      if (userIds.length > 0) {
        try {
          const users = await getUserList(userIds)
          const userMap = new Map()

          users.forEach(user => {
            userMap.set(user.id, {
              id: user.id,
              fullName: user.fullName,
              username: user.username,
              displayName: user.displayName,
              imageUrl: user.avatarUrl,
              email: user.username // 使用用户名作为邮箱的替代
            })
          })

          prompts = prompts.map(prompt => ({
            ...prompt,
            creator: userMap.get(prompt.created_by) || null
          }))
        } catch (error) {
          console.warn('Failed to fetch creator details:', error)
          // Continue without creator details rather than failing
        }
      }
    }

    return NextResponse.json({
      prompts: prompts,
      pagination: {
        page,
        limit,
        total: countResult.count || 0,
        totalPages: Math.ceil((countResult.count || 0) / limit)
      }
    })
  } catch (error) {
    return handleApiError(error, 'Unable to load prompts')
  }
}

export async function POST(request) {
  try {
    const userId = await requireUserId()
    const { teamId, supabase, teamService } = await resolveTeamContext(request, userId, {
      requireMembership: false,
      allowMissingTeam: true
    })

    let targetTeamId = null
    if (teamId) {
      await teamService.requireMembership(teamId, userId)
      targetTeamId = teamId
    }

    const data = await request.json()
    const timestamp = new Date().toISOString()

    // Check for duplicate title within the team context
    const titleCheckQuery = targetTeamId
      ? supabase
          .from('prompts')
          .select('id')
          .eq('team_id', targetTeamId)
          .eq('title', data.title)
          .single()
      : supabase
          .from('prompts')
          .select('id')
          .is('team_id', null)
          .eq('created_by', userId)
          .eq('title', data.title)
          .single()

    const { data: existingPrompt, error: checkError } = await titleCheckQuery

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      throw checkError
    }

    if (existingPrompt) {
      return NextResponse.json(
        {
          error: targetTeamId
            ? 'A prompt with this title already exists in this team'
            : 'A prompt with this title already exists in your personal collection'
        },
        { status: 409 }
      )
    }

    const promptPayload = {
      id: generateUUID(),
      team_id: targetTeamId,
      project_id: targetTeamId ? data.projectId || null : null,
      title: data.title,
      content: data.content,
      description: data.description || null,
      created_by: userId,
      user_id: userId,
      version: data.version || null,
      tags: data.tags || null,
      is_public: data.is_public ?? false,
      cover_img: data.cover_img || data.image_url || null,
      created_at: timestamp,
      updated_at: timestamp
    }

    const { data: newPrompt, error } = await supabase
      .from('prompts')
      .insert([promptPayload])
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: targetTeamId
              ? 'A prompt with this title already exists in this team'
              : 'A prompt with this title already exists in your personal collection'
          },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(newPrompt, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Unable to create prompt')
  }
}
