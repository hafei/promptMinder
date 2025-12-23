import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth.js'
import { handleApiError } from '@/lib/handle-api-error.js'
import { resolveTeamContext } from '@/lib/team-request.js'

async function getPromptId(paramsPromise) {
  const { id } = await paramsPromise
  if (!id) {
    throw new Error('Prompt id missing in route params')
  }
  return id
}

export async function GET(request, { params }) {
  try {
    const id = await getPromptId(params)
    const userId = await requireUserId()
    const { teamId, supabase, teamService } = await resolveTeamContext(request, userId, {
      requireMembership: false,
      allowMissingTeam: true,
    })

    // First, get the original prompt to determine its prompt_id and team
    let promptQuery = supabase.from('prompts').select('prompt_id, team_id, created_by').eq('id', id)

    if (teamId) {
      await teamService.requireMembership(teamId, userId)
      promptQuery = promptQuery.eq('team_id', teamId)
    } else {
      promptQuery = promptQuery.or(`created_by.eq.${userId},user_id.eq.${userId}`)
    }

    const { data: originalPrompt, error: promptError } = await promptQuery.maybeSingle()

    if (promptError) {
      throw promptError
    }

    if (!originalPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Now get all versions of this prompt using prompt_id
    // Versions are determined by having the same prompt_id
    let versionsQuery = supabase
      .from('prompts')
      .select('*')
      .eq('prompt_id', originalPrompt.prompt_id)
      .order('created_at', { ascending: false })
      .limit(100) // Limit to prevent excessive results

    if (originalPrompt.team_id) {
      // For team prompts, get versions within the same team
      versionsQuery = versionsQuery.eq('team_id', originalPrompt.team_id)
    } else {
      // For personal prompts, get versions for the same user
      versionsQuery = versionsQuery
        .is('team_id', null)
        .eq('created_by', originalPrompt.created_by)
    }

    const { data: versions, error: versionsError } = await versionsQuery

    if (versionsError) {
      throw versionsError
    }

    return NextResponse.json(versions || [])
  } catch (error) {
    return handleApiError(error, 'Unable to load prompt versions')
  }
}