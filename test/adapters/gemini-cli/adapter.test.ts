import { describe, it, expect } from 'vitest'
import { geminiCliAdapter } from '../../../src/adapters/gemini-cli/adapter'

describe('geminiCliAdapter', () => {
  const sampleInput = {
    hook_event_name: 'BeforeTool',
    tool_name: 'run_shell_command',
    tool_input: { command: 'ls -la' },
    cwd: '/path/to/project',
    transcript_path: '/path/to/transcript.json',
  }

  describe('parseHook', () => {
    it('should parse valid Gemini CLI hook data', () => {
      const result = geminiCliAdapter.parseHook(JSON.stringify(sampleInput))
      if (result.kind !== 'action') throw new Error('Expected action')

      expect(result.action.toolName).toBe('run_shell_command')
      expect(result.action.toolInput).toEqual({ command: 'ls -la' })
      expect(result.action.transcriptPath).toBe('/path/to/transcript.json')
    })

    it('should skip if hook_event_name is not BeforeTool', () => {
      const input = { ...sampleInput, hook_event_name: 'AfterTool' }
      const result = geminiCliAdapter.parseHook(JSON.stringify(input))
      expect(result.kind).toBe('skip')
    })

    it('should skip on invalid JSON', () => {
      const result = geminiCliAdapter.parseHook('invalid')
      expect(result.kind).toBe('skip')
    })
  })

  describe('formatResponse', () => {
    it('should format block decision as Gemini CLI expects', () => {
      const response = geminiCliAdapter.formatResponse({
        decision: 'block',
        reason: 'forbidden command',
      })
      expect(JSON.parse(response)).toEqual({
        decision: 'block',
        reason: 'forbidden command',
      })
    })

    it('should format allow decision as Gemini CLI expects', () => {
      const response = geminiCliAdapter.formatResponse({
        decision: undefined,
        reason: 'all good',
      })
      expect(JSON.parse(response)).toEqual({
        decision: 'allow',
        reason: 'all good',
      })
    })
  })

  describe('matches', () => {
    it('matches BeforeTool', () => {
      expect(
        geminiCliAdapter.matches({ hook_event_name: 'BeforeTool' })
      ).toBe(true)
    })

    it('matches AfterTool so formatting stays Gemini-shaped on post-events', () => {
      expect(
        geminiCliAdapter.matches({ hook_event_name: 'AfterTool' })
      ).toBe(true)
    })

    it('does not match Claude Code PreToolUse', () => {
      expect(
        geminiCliAdapter.matches({ hook_event_name: 'PreToolUse' })
      ).toBe(false)
    })

    it('does not match Cursor camelCase events', () => {
      expect(
        geminiCliAdapter.matches({ hook_event_name: 'beforeShellExecution' })
      ).toBe(false)
    })

    it('does not match non-object payloads or missing hook_event_name', () => {
      expect(geminiCliAdapter.matches(null)).toBe(false)
      expect(geminiCliAdapter.matches({})).toBe(false)
    })
  })
})
