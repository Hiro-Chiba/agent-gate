import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import {
  suggestRules,
  formatSuggestions,
} from '../../src/observability/suggest'

const TEST_DIR = join(__dirname, '..', '..', 'tmp', 'test-suggest')
const LOG = join(TEST_DIR, 'log.jsonl')

function entry(over: Partial<Record<string, unknown>> = {}): string {
  return (
    JSON.stringify({
      timestamp: new Date().toISOString(),
      adapter: 'claude-code',
      toolName: 'Bash',
      decision: 'block',
      reason: 'reason',
      source: 'ai',
      ...over,
    }) + '\n'
  )
}

describe('suggestRules', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
  })
  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('returns an empty list when the log does not exist', () => {
    const out = suggestRules(join(TEST_DIR, 'missing.jsonl'), { windowDays: 7 })
    expect(out).toEqual([])
  })

  it('returns an empty list when the log is empty', () => {
    writeFileSync(LOG, '')
    const out = suggestRules(LOG, { windowDays: 7 })
    expect(out).toEqual([])
  })

  it('suggests promoting an AI block pattern that repeats N or more times', () => {
    let lines = ''
    for (let i = 0; i < 4; i++) {
      lines += entry({
        decision: 'block',
        source: 'ai',
        reason: 'DROP TABLE in production is forbidden',
      })
    }
    writeFileSync(LOG, lines)
    const out = suggestRules(LOG, { windowDays: 7, minPatternCount: 3 })
    const promote = out.find((s) => s.kind === 'add-rule')
    expect(promote).toBeDefined()
    expect(promote?.count).toBe(4)
    expect(promote?.toolName).toBe('Bash')
    expect(promote?.reasonExcerpt).toMatch(/DROP TABLE/)
  })

  it('does not suggest promotion below the threshold', () => {
    let lines = ''
    for (let i = 0; i < 2; i++) {
      lines += entry({
        decision: 'block',
        source: 'ai',
        reason: 'rare pattern',
      })
    }
    writeFileSync(LOG, lines)
    const out = suggestRules(LOG, { windowDays: 7, minPatternCount: 3 })
    expect(out.find((s) => s.kind === 'add-rule')).toBeUndefined()
  })

  it('only considers AI blocks (not deterministic blocks) for add-rule suggestions', () => {
    let lines = ''
    for (let i = 0; i < 5; i++) {
      lines += entry({
        decision: 'block',
        source: 'deterministic',
        ruleId: 'prevent-rm-rf-root',
        reason: 'catastrophic',
      })
    }
    writeFileSync(LOG, lines)
    const out = suggestRules(LOG, { windowDays: 7, minPatternCount: 3 })
    expect(out.find((s) => s.kind === 'add-rule')).toBeUndefined()
  })

  it('suggests reviewing a deterministic rule that fires 0 times in the window', () => {
    const old = new Date(Date.now() - 100 * 86400_000).toISOString()
    let lines = ''
    // Only one rule has fired recently
    lines += entry({
      decision: 'block',
      source: 'deterministic',
      ruleId: 'prevent-rm-rf-root',
    })
    // Another rule has fired but only outside the window
    lines += entry({
      timestamp: old,
      decision: 'block',
      source: 'deterministic',
      ruleId: 'prevent-secret-file-write',
    })
    writeFileSync(LOG, lines)
    const out = suggestRules(LOG, {
      windowDays: 7,
      minPatternCount: 3,
      knownRuleIds: [
        'prevent-rm-rf-root',
        'prevent-secret-file-write',
        'prevent-bash-secret-write',
      ],
    })
    const staleIds = out
      .filter((s) => s.kind === 'disable-rule')
      .map((s) => s.ruleId)
    expect(staleIds).toContain('prevent-secret-file-write')
    expect(staleIds).toContain('prevent-bash-secret-write')
    expect(staleIds).not.toContain('prevent-rm-rf-root')
  })

  it('honors windowDays for AI-block grouping', () => {
    const old = new Date(Date.now() - 100 * 86400_000).toISOString()
    let lines = ''
    for (let i = 0; i < 5; i++) {
      lines += entry({
        timestamp: old,
        decision: 'block',
        source: 'ai',
        reason: 'an ancient pattern',
      })
    }
    writeFileSync(LOG, lines)
    const out = suggestRules(LOG, { windowDays: 7, minPatternCount: 3 })
    expect(out.find((s) => s.kind === 'add-rule')).toBeUndefined()
  })

  it('skips malformed lines without throwing', () => {
    let lines = 'not json\n'
    for (let i = 0; i < 3; i++) {
      lines += entry({
        decision: 'block',
        source: 'ai',
        reason: 'consistent pattern X',
      })
    }
    writeFileSync(LOG, lines)
    const out = suggestRules(LOG, { windowDays: 7, minPatternCount: 3 })
    expect(out.find((s) => s.kind === 'add-rule')).toBeDefined()
  })
})

describe('formatSuggestions', () => {
  it('returns a friendly message when there are no suggestions', () => {
    expect(formatSuggestions([])).toMatch(/no suggestions|nothing/i)
  })

  it('renders an add-rule suggestion with count and excerpt', () => {
    const text = formatSuggestions([
      {
        kind: 'add-rule',
        toolName: 'Bash',
        reasonExcerpt: 'DROP TABLE in production',
        count: 5,
        message: 'msg',
      },
    ])
    expect(text).toContain('Bash')
    expect(text).toContain('5')
    expect(text).toContain('DROP TABLE')
  })

  it('renders a disable-rule suggestion', () => {
    const text = formatSuggestions([
      {
        kind: 'disable-rule',
        ruleId: 'prevent-force-push-main',
        count: 0,
        message: 'rule has not fired',
      },
    ])
    expect(text).toContain('prevent-force-push-main')
  })
})
