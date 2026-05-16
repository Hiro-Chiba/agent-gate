import { DeterministicRule, RuleVerdict } from './types'

export function runDeterministicRules(
  toolName: string,
  toolInput: Record<string, unknown>,
  rules: DeterministicRule[]
): RuleVerdict {
  for (const rule of rules) {
    const verdict = rule.check(toolName, toolInput)
    if (verdict.kind === 'block') {
      return verdict
    }
  }
  return { kind: 'allow' }
}
