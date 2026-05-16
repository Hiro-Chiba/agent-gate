import { RuleSource } from '../contracts/types/RuleSource'
import { Finding } from './findings'

const AMBIGUOUS_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\bwhere possible\b/i, label: 'where possible' },
  { regex: /\bas (?:needed|appropriate)\b/i, label: 'as needed/appropriate' },
  { regex: /\bwhen appropriate\b/i, label: 'when appropriate' },
  { regex: /\bif possible\b/i, label: 'if possible' },
  { regex: /\bshould consider\b/i, label: 'should consider' },
  { regex: /\bgenerally speaking\b/i, label: 'generally speaking' },
  { regex: /\btry to\b/i, label: 'try to' },
  { regex: /適切に/, label: '適切に' },
  { regex: /なるべく/, label: 'なるべく' },
  { regex: /可能な限り/, label: '可能な限り' },
  { regex: /必要に応じて/, label: '必要に応じて' },
  { regex: /できれば/, label: 'できれば' },
  { regex: /状況に応じて/, label: '状況に応じて' },
]

const IMPERATIVE_HINTS = [
  /^[\s\-*\d.]*(?:never|always|do not|don[''']t|must|should|use|avoid|prefer|run|check)\b/i,
  /^\s*[-*]\s+/, // bullet items
  /^\s*\d+\.\s+/, // numbered items
  /禁止|必須|常に|決して|してはいけない|すること|してください|する/, // Japanese imperatives
]

function isEmpty(content: string): boolean {
  return content.trim().length === 0
}

function hasConcreteRules(content: string): boolean {
  const lines = content.split('\n')
  return lines.some((line) =>
    IMPERATIVE_HINTS.some((re) => re.test(line))
  )
}

function findAmbiguousLines(content: string): { line: number; match: string }[] {
  const out: { line: number; match: string }[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const { regex, label } of AMBIGUOUS_PATTERNS) {
      if (regex.test(line)) {
        out.push({ line: i + 1, match: label })
        break
      }
    }
  }
  return out
}

function trimExcerpt(line: string): string {
  const t = line.trim()
  return t.length > 80 ? t.slice(0, 77) + '...' : t
}

export function lintRuleSources(sources: RuleSource[]): Finding[] {
  const findings: Finding[] = []
  for (const source of sources) {
    if (isEmpty(source.content)) {
      findings.push({
        ruleSourcePath: source.path,
        ruleSourceKind: source.kind,
        severity: 'warning',
        code: 'empty-file',
        message:
          'Instruction file is empty. Either remove it or fill in concrete project rules so the AI has something to enforce.',
      })
      continue
    }

    if (!hasConcreteRules(source.content)) {
      findings.push({
        ruleSourcePath: source.path,
        ruleSourceKind: source.kind,
        severity: 'warning',
        code: 'no-concrete-rules',
        message:
          'No imperatives (must / should / never / "use X") or bulleted/numbered items detected. The AI may struggle to extract actionable rules.',
      })
    }

    const ambiguousLines = findAmbiguousLines(source.content)
    for (const a of ambiguousLines) {
      const excerpt = trimExcerpt(source.content.split('\n')[a.line - 1] ?? '')
      findings.push({
        ruleSourcePath: source.path,
        ruleSourceKind: source.kind,
        severity: 'info',
        code: 'ambiguous-modifier',
        message: `Ambiguous modifier "${a.match}" makes the rule hard for AI to enforce reliably. Replace with a concrete condition or threshold.`,
        line: a.line,
        excerpt,
      })
    }
  }
  return findings
}
