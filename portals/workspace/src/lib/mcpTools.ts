import type { SurfaceId } from '@/types'

/**
 * MCP tool attributes attached to each surface container.
 * Enable autonomous frontend testing and agent tool calls via MCP.
 */
export const MCP_TOOLS: Record<SurfaceId, string> = {
  home: 'homeSurface',
  docs: 'docsSurface',
  forum: 'forumSurface',
  life: 'lifeSurface',
  sheets: 'sheetCell',
  slides: 'slidesSurface',
  calendar: 'calendarSurface',
  mail: 'mailSurface',
  drive: 'driveSurface',
  profile: 'profileSurface',
  identity: 'identitySurface',
}

export const MCP_HANDLERS: Record<SurfaceId, string> = {
  home: 'mcp_p31_home_launch',
  docs: 'mcp_p31_docs_edit',
  forum: 'mcp_p31_forum_answer',
  life: 'mcp_p31_life_log',
  sheets: 'mcp_p31_sheets_eval',
  slides: 'mcp_p31_slides_present',
  calendar: 'mcp_p31_calendar_event',
  mail: 'mcp_p31_mail_send',
  drive: 'mcp_p31_drive_storage',
  profile: 'mcp_p31_profile_view',
  identity: 'mcp_p31_identity_view',
}