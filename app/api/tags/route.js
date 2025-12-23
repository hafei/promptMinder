import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth.js'
import { resolveTeamContext } from '@/lib/team-request.js'
import { handleApiError } from '@/lib/handle-api-error.js'
import { generateUUID } from '@/lib/utils';

function applyTagFilters(query, { teamId, userId }) {
  let baseQuery

  if (teamId) {
    // Get team tags
    baseQuery = query.eq('team_id', teamId)
  } else {
    // Get personal tags - use user_id field for filtering
    baseQuery = query.is('team_id', null).eq('user_id', userId)
  }

  return baseQuery
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

    const filters = { teamId, userId }

    const { data: tags, error } = await applyTagFilters(
      supabase
        .from('tags')
        .select('*'),
      filters
    )
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json(tags);
  } catch (error) {
    return handleApiError(error, 'Unable to load tags')
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

    const { name } = await request.json();

    // Check for duplicate name within the team/personal context
    const nameCheckQuery = targetTeamId
      ? supabase
          .from('tags')
          .select('id')
          .eq('team_id', targetTeamId)
          .eq('name', name)
          .single()
      : supabase
          .from('tags')
          .select('id')
          .is('team_id', null)
          .eq('user_id', userId)  // Use user_id instead of created_by
          .eq('name', name)
          .single()

    const { data: existingTag, error: checkError } = await nameCheckQuery

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      throw checkError
    }

    if (existingTag) {
      return NextResponse.json(
        {
          error: targetTeamId
            ? 'A tag with this name already exists in this team'
            : 'A tag with this name already exists in your personal collection'
        },
        { status: 409 }
      )
    }

    const tagData = {
      id: generateUUID(),
      team_id: targetTeamId,
      user_id: targetTeamId ? null : userId,  // Set user_id only for personal tags
      name,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newTag, error } = await supabase
      .from('tags')
      .insert([tagData])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: targetTeamId
              ? 'A tag with this name already exists in this team'
              : 'A tag with this name already exists in your personal collection'
          },
          { status: 409 }
        )
      }
      throw error;
    }

    return NextResponse.json(newTag);
  } catch (error) {
    return handleApiError(error, 'Unable to create tag')
  }
}

export async function DELETE(request) {
  try {
    const userId = await requireUserId()
    const { teamId, supabase, teamService } = await resolveTeamContext(request, userId, {
      requireMembership: false,
      allowMissingTeam: true
    })

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');

    // 首先检查标签是否存在
    const { data: tag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    // 检查权限
    if (tag.team_id) {
      // Team tag - check if user is member of the team
      if (tag.team_id !== teamId) {
        return NextResponse.json({ error: '无权删除此标签' }, { status: 403 });
      }
      await teamService.requireMembership(tag.team_id, userId)
    } else {
      // Personal tag - check if user owns the tag
      if (tag.created_by !== userId) {
        return NextResponse.json({ error: '无权删除此标签' }, { status: 403 });
      }
    }

    // 执行删除操作
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Unable to delete tag')
  }
}

export async function PATCH(request) {
  try {
    const userId = await requireUserId()
    const { teamId, supabase, teamService } = await resolveTeamContext(request, userId, {
      requireMembership: false,
      allowMissingTeam: true
    })

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');
    const { name } = await request.json();

    // 首先检查标签是否存在
    const { data: tag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    // 检查权限
    if (tag.team_id) {
      // Team tag - check if user is member of the team
      if (tag.team_id !== teamId) {
        return NextResponse.json({ error: '无权修改此标签' }, { status: 403 });
      }
      await teamService.requireMembership(tag.team_id, userId)
    } else {
      // Personal tag - check if user owns the tag
      if (tag.created_by !== userId) {
        return NextResponse.json({ error: '无权修改此标签' }, { status: 403 });
      }
    }

    // Check for duplicate name within the team/personal context (excluding current tag)
    const nameCheckQuery = tag.team_id
      ? supabase
          .from('tags')
          .select('id')
          .eq('team_id', tag.team_id)
          .eq('name', name)
          .neq('id', tagId)
          .single()
      : supabase
          .from('tags')
          .select('id')
          .is('team_id', null)
          .eq('user_id', userId)  // Use user_id instead of created_by
          .eq('name', name)
          .neq('id', tagId)
          .single()

    const { data: existingTag, error: checkError } = await nameCheckQuery

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      throw checkError
    }

    if (existingTag) {
      return NextResponse.json(
        {
          error: tag.team_id
            ? 'A tag with this name already exists in this team'
            : 'A tag with this name already exists in your personal collection'
        },
        { status: 409 }
      )
    }

    // 执行更新操作
    const { data: updatedTag, error: updateError } = await supabase
      .from('tags')
      .update({
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', tagId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedTag);
  } catch (error) {
    return handleApiError(error, 'Unable to update tag')
  }
}
