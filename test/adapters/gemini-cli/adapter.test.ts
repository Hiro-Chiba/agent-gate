import { describe, it, expect, vi } from 'vitest'
import { geminiCliAdapter } from '../../../src/adapters/gemini-cli/adapter'
import * as fs from 'fs'

vi.mock('fs')

describe('geminiCliAdapter', () => {
  const sampleInput = {
    hook_event_name: 'BeforeTool',
    tool_name: 'run_shell_command',
    tool_input: { command: 'ls -la' },
    cwd: '/path/to/project',
    transcript_path: '/path/to/transcript.json'
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
        reason: 'forbidden command'
      })
      expect(JSON.parse(response)).toEqual({
        decision: 'block',
        reason: 'forbidden command'
      })
    })

    it('should format allow decision as Gemini CLI expects', () => {
      const response = geminiCliAdapter.formatResponse({
        decision: undefined,
        reason: 'all good'
      })
      expect(JSON.parse(response)).toEqual({
        decision: 'allow',
        reason: 'all good'
      })
    })
  })

  describe('readHistory', () => {
    it('should return empty array if no transcriptPath', async () => {
      const history = await geminiCliAdapter.readHistory({ cwd: '/test' })
      expect(history).toEqual([])
    })

    it('should parse transcript JSON correctly', async () => {
      const transcript = [
        { role: 'user', content: 'hello' },
        {
          role: 'model',
          content: 'thinking',
          tool_calls: [{
            id: '1',
            type: 'function',
            function: { name: 'read_file', arguments: '{"path":"a.txt"}' }
          }]
        },
        { role: 'tool', tool_call_id: '1', content: 'file content' }
      ]

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(transcript))

      const history = await geminiCliAdapter.readHistory({
        cwd: '/test',
        transcriptPath: '/test/transcript.json'
      })

      expect(history).toHaveLength(3)
      expect(history[0].kind).toBe('user-message')
      expect(history[1].kind).toBe('tool-call')
      expect(history[1].toolName).toBe('read_file')
      expect(history[2].kind).toBe('tool-result')
    })
  })
})
