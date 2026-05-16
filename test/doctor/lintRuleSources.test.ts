import { describe, it, expect } from 'vitest'
import { lintRuleSources } from '../../src/doctor/lintRuleSources'
import { RuleSource } from '../../src/contracts/types/RuleSource'

function src(content: string, path = '/p/CLAUDE.md'): RuleSource {
  return { path, content, kind: 'claude-md' }
}

describe('lintRuleSources', () => {
  it('returns no findings for a healthy rule file', () => {
    const findings = lintRuleSources([
      src(
        '# Rules\n\n- Never run `rm -rf`\n- Always run `npm test` before commit\n- Do not edit `.env`'
      ),
    ])
    expect(findings).toEqual([])
  })

  it('flags an empty file', () => {
    const findings = lintRuleSources([src('')])
    expect(findings.some((f) => f.code === 'empty-file')).toBe(true)
  })

  it('flags a whitespace-only file as empty', () => {
    const findings = lintRuleSources([src('   \n\n  ')])
    expect(findings.some((f) => f.code === 'empty-file')).toBe(true)
  })

  it('flags English ambiguous modifiers like "where possible"', () => {
    const findings = lintRuleSources([
      src('- Use modern TypeScript where possible.\n- Avoid unnecessary state.'),
    ])
    const ambiguity = findings.filter((f) => f.code === 'ambiguous-modifier')
    expect(ambiguity).toHaveLength(1)
    expect(ambiguity[0].line).toBe(1)
    expect(ambiguity[0].excerpt).toMatch(/where possible/i)
  })

  it('flags Japanese ambiguous modifiers like 適切に', () => {
    const findings = lintRuleSources([
      src('- 適切にエラーハンドリングを行う。\n- 必須要件のみ実装する。'),
    ])
    expect(
      findings.some(
        (f) => f.code === 'ambiguous-modifier' && f.excerpt?.includes('適切に')
      )
    ).toBe(true)
  })

  it('flags a file that has no concrete rules (no imperatives, no bullets)', () => {
    const findings = lintRuleSources([
      src('# Style\n\nThis project values readable code and well-tested APIs.'),
    ])
    expect(findings.some((f) => f.code === 'no-concrete-rules')).toBe(true)
  })

  it('does NOT flag no-concrete-rules when there are bullet imperatives', () => {
    const findings = lintRuleSources([
      src('# Style\n\n- Use kebab-case for file names.\n- Run `npm test` before commit.'),
    ])
    expect(findings.some((f) => f.code === 'no-concrete-rules')).toBe(false)
  })

  it('attributes findings to the correct source kind and path', () => {
    const findings = lintRuleSources([
      { path: '/p/AGENTS.md', content: '', kind: 'agents-md' },
    ])
    const empty = findings.find((f) => f.code === 'empty-file')
    expect(empty?.ruleSourcePath).toBe('/p/AGENTS.md')
    expect(empty?.ruleSourceKind).toBe('agents-md')
  })

  it('reports findings across multiple sources', () => {
    const findings = lintRuleSources([
      src('', '/p/CLAUDE.md'),
      src('- Use modern TypeScript where possible.', '/p/AGENTS.md'),
    ])
    const paths = new Set(findings.map((f) => f.ruleSourcePath))
    expect(paths.has('/p/CLAUDE.md')).toBe(true)
    expect(paths.has('/p/AGENTS.md')).toBe(true)
  })
})
