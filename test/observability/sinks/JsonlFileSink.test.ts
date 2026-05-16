import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { JsonlFileSink } from '../../../src/observability/sinks/JsonlFileSink'
import { PipelineEvent } from '../../../src/observability/sinks/Sink'

const TEST_DIR = join(__dirname, '..', '..', '..', 'tmp', 'test-jsonl-sink')
const LOG = join(TEST_DIR, 'log.jsonl')

describe('JsonlFileSink', () => {
  beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }))
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }))

  it('writes verdict.decided events as DecisionLogEntry JSONL', () => {
    const sink = new JsonlFileSink(LOG)
    const event: PipelineEvent = {
      type: 'verdict.decided',
      adapter: 'claude-code',
      toolName: 'Bash',
      decision: 'block',
      reason: 'no good',
      source: 'deterministic',
      ruleId: 'r1',
    }
    sink.handle(event)
    const line = readFileSync(LOG, 'utf-8').trim()
    const parsed = JSON.parse(line) as Record<string, unknown>
    expect(parsed.adapter).toBe('claude-code')
    expect(parsed.toolName).toBe('Bash')
    expect(parsed.decision).toBe('block')
    expect(parsed.source).toBe('deterministic')
    expect(parsed.ruleId).toBe('r1')
    expect(typeof parsed.timestamp).toBe('string')
  })

  it('ignores non-verdict events by default', () => {
    const sink = new JsonlFileSink(LOG)
    sink.handle({
      type: 'ai.requested',
      adapter: 'claude-code',
      toolName: 'Bash',
      rulesCount: 5,
    })
    expect(() => readFileSync(LOG, 'utf-8')).toThrow()
  })

  it('creates the parent directory automatically', () => {
    const nested = join(TEST_DIR, 'deep', 'sub', 'log.jsonl')
    const sink = new JsonlFileSink(nested)
    sink.handle({
      type: 'verdict.decided',
      adapter: 'claude-code',
      toolName: 'Bash',
      decision: 'allow',
      reason: '',
      source: 'pass',
    })
    const content = readFileSync(nested, 'utf-8').trim()
    expect(content.length).toBeGreaterThan(0)
  })
})
