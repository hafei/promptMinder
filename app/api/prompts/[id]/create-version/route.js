import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth.js'
import { handleApiError } from '@/lib/handle-api-error.js'
import { resolveTeamContext } from '@/lib/team-request.js'
import { TEAM_ROLES } from '@/lib/team-service.js'
import { generateUUID } from '@/lib/utils'

async function getPromptId(paramsPromise) {
  const { id } = await paramsPromise
  if (!id) {
    throw new Error('Prompt id missing in route params')
  }
  return id
}

function isCreator(prompt, userId) {
  return prompt.created_by === userId || prompt.user_id === userId
}

function ensureManagerPermission(membership) {
  return membership && [TEAM_ROLES.ADMIN, TEAM_ROLES.OWNER].includes(membership.role)
}

export async function POST(request, { params }) {
  try {
    const id = await getPromptId(params)
    console.log('Creating version for prompt ID:', id)

    const userId = await requireUserId()
    console.log('User ID:', userId)

    const { teamId, supabase, teamService } = await resolveTeamContext(request, userId, {
      requireMembership: false,
      allowMissingTeam: true,
    })
    console.log('Team context ID:', teamId)

    // Get the original prompt to base the new version on
    let promptQuery = supabase.from('prompts').select('*').eq('id', id)

    if (teamId) {
      promptQuery = promptQuery.eq('team_id', teamId)
    } else {
      promptQuery = promptQuery.or(`created_by.eq.${userId},user_id.eq.${userId}`)
    }

    const { data: originalPrompt, error: promptError } = await promptQuery.maybeSingle()

    if (promptError) {
      throw promptError
    }

      if (!originalPrompt) {
      console.log('Original prompt not found')
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    console.log('Original prompt found:', {
      id: originalPrompt.id,
      title: originalPrompt.title,
      team_id: originalPrompt.team_id,
      created_by: originalPrompt.created_by
    })

    // Check permissions
    let membership = null
    if (originalPrompt.team_id) {
      membership = await teamService.getTeamMembership(originalPrompt.team_id, userId)
      console.log('Team membership:', membership)
    }

    const creatorCheck = isCreator(originalPrompt, userId)
    const managerCheck = ensureManagerPermission(membership)
    console.log('Permission checks:', { creatorCheck, managerCheck })

    if (!creatorCheck && !managerCheck) {
      console.log('Permission denied')
      return NextResponse.json({
        error: 'Only the creator or team managers can create new versions'
      }, { status: 403 })
    }

    // Get the new version data from request body
    const versionData = await request.json()
    const timestamp = new Date().toISOString()

    // Create new version based on the original prompt
    const newVersionPayload = {
      id: generateUUID(),
      team_id: originalPrompt.team_id, // Keep the same team_id
      project_id: originalPrompt.project_id,
      title: versionData.title || originalPrompt.title,
      content: versionData.content || originalPrompt.content,
      description: versionData.description || originalPrompt.description,
      created_by: userId,
      user_id: userId,
      version: versionData.version || originalPrompt.version,
      tags: versionData.tags || originalPrompt.tags,
      is_public: versionData.is_public !== undefined ? versionData.is_public : originalPrompt.is_public,
      cover_img: versionData.cover_img || originalPrompt.cover_img,
      created_at: timestamp,
      updated_at: timestamp
    }

    // Insert the new version
    const { data: newVersion, error: insertError } = await supabase
      .from('prompts')
      .insert([newVersionPayload])
      .select()
      .single()

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            error: originalPrompt.team_id
              ? 'A prompt with this title already exists in this team'
              : 'A prompt with this title already exists in your personal collection'
          },
          { status: 409 }
        )
      }
      throw insertError
    }

    return NextResponse.json(newVersion, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Unable to create new version')
  }
}