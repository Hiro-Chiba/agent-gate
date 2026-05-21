import { Adapter } from '../Adapter'
import { ParsedHook } from '../../contracts/types/Action'
import { ValidationResult } from '../../contracts/types/ValidationResult'
import { HookDataSchema } from '../../contracts/schemas/hookDataSchema'

const HOOK_EVENT_BEFORE_TOOL = 'BeforeTool'

export const geminiCliAdapter: Adapter = {
  id: 'gemini-cli',

  matches(raw: unknown): boolean {
    if (typeof raw !== 'object' || raw === null) return false
    const event = (raw as Record<string, unknown>)['hook_event_name']
    // Gemini CLI uses PascalCase Before*/After* (BeforeTool, AfterTool).
    // Disjoint from Claude Code's Pre*/Post* and Cursor's camelCase.
    return typeof event === 'string' && /^(Before|After)[A-Z]/.test(event)
  },

  parseHook(stdinJson: string): ParsedHook {
    let raw: unknown
    try {
      raw = JSON.parse(stdinJson)
    } catch {
      return { kind: 'skip', reason: 'invalid JSON' }
    }

    const parsed = HookDataSchema.safeParse(raw)
    if (!parsed.success) {
      return { kind: 'skip', reason: 'unrecognized hook payload' }
    }

    const data = parsed.data
    if (data.hook_event_name !== HOOK_EVENT_BEFORE_TOOL) {
      return {
        kind: 'skip',
        reason: `not a ${HOOK_EVENT_BEFORE_TOOL} event: ${data.hook_event_name}`,
      }
    }

    const toolName = data.tool_name
    const toolInput = data.tool_input
    if (!toolName || !toolInput) {
      return { kind: 'skip', reason: 'missing tool_name or tool_input' }
    }

    return {
      kind: 'action',
      action: {
        toolName,
        toolInput,
        transcriptPath: data.transcript_path,
      },
    }
  },

  formatResponse(result: ValidationResult): string {
    return JSON.stringify({
      decision: result.decision === 'block' ? 'block' : 'allow',
      reason: result.reason,
    })
  },
}
