import { existsSync, readFileSync } from 'fs'
import { Adapter, ReadHistoryOptions } from '../Adapter'
import { ParsedHook } from '../../contracts/types/Action'
import { ValidationResult } from '../../contracts/types/ValidationResult'
import { HookDataSchema } from '../../contracts/schemas/hookDataSchema'
import { SessionEvent } from '../../contracts/types/SessionContext'

const HOOK_EVENT_BEFORE_TOOL = 'BeforeTool'

interface GeminiTranscriptMessage {
  role: 'user' | 'model' | 'tool'
  content?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export const geminiCliAdapter: Adapter = {
  id: 'gemini-cli',

  parseHook(stdinJson: string): ParsedHook {
    // ... parseHook implementation remains the same
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
      return { kind: 'skip', reason: `not a ${HOOK_EVENT_BEFORE_TOOL} event: ${data.hook_event_name}` }
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
      decision: result.decision === 'block' ? 'deny' : 'allow',
      reason: result.reason,
    })
  },

  async readHistory(opts: ReadHistoryOptions): Promise<SessionEvent[]> {
    if (!opts.transcriptPath || !existsSync(opts.transcriptPath)) {
      return []
    }

    let content: string
    try {
      content = readFileSync(opts.transcriptPath, 'utf-8')
    } catch {
      return []
    }

    let messages: GeminiTranscriptMessage[]
    try {
      messages = JSON.parse(content) as GeminiTranscriptMessage[]
    } catch {
      return []
    }

    const events: SessionEvent[] = []
    for (const msg of messages) {
      if (msg.role === 'user') {
        events.push({ kind: 'user-message', raw: msg })
      } else if (msg.role === 'model') {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            let toolInput: Record<string, unknown> | undefined
            try {
              toolInput = JSON.parse(tc.function.arguments) as Record<
                string,
                unknown
              >
            } catch {
              // ignore
            }
            events.push({
              kind: 'tool-call',
              toolName: tc.function.name,
              toolInput,
              raw: msg,
            })
          }
        } else {
          events.push({ kind: 'assistant-message', raw: msg })
        }
      } else if (msg.role === 'tool') {
        events.push({ kind: 'tool-result', raw: msg })
      }
    }

    const limit = opts.limit ?? events.length
    return events.slice(-limit)
  },
}
