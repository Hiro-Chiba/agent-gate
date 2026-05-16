import { describe, it, expect } from 'vitest'
import { formatFindings } from '../../src/doctor/formatFindings'
import { Finding } from '../../src/doctor/findings'

function f(over: Partial<Finding> = {}): Finding {
  return {
    ruleSourcePath: '/p/CLAUDE.md',
    ruleSourceKind: 'claude-md',
    severity: 'warning',
    code: 'empty-file',
    message: 'empty',
    ...over,
  }
}

describe('formatFindings', () => {
  it('returns a "no issues" message for an empty input', () => {
    const out = formatFindings([])
    expect(out).toMatch(/no issues|all good|0 finding/i)
  })

  it('groups findings by source path', () => {
    const out = formatFindings([
      f({ ruleSourcePath: '/p/CLAUDE.md', code: 'empty-file' }),
      f({
        ruleSourcePath: '/p/AGENTS.md',
        code: 'ambiguous-modifier',
        line: 3,
        excerpt: 'where possible',
      }),
    ])
    expect(out).toContain('/p/CLAUDE.md')
    expect(out).toContain('/p/AGENTS.md')
  })

  it('shows severity and code per finding', () => {
    const out = formatFindings([
      f({
        severity: 'info',
        code: 'ambiguous-modifier',
        message: 'be specific',
        line: 2,
        excerpt: '- 適切に対応する',
      }),
    ])
    expect(out).toMatch(/info/i)
    expect(out).toContain('ambiguous-modifier')
    expect(out).toContain('be specific')
  })

  it('prints a totals line at the end', () => {
    const out = formatFindings([
      f({ severity: 'warning' }),
      f({ severity: 'info', code: 'ambiguous-modifier' }),
      f({ severity: 'info', code: 'ambiguous-modifier' }),
    ])
    expect(out).toMatch(/3 finding/i)
  })
})
