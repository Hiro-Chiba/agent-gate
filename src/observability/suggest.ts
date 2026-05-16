import { readFileSync, existsSync } from 'fs'
import { DecisionLogEntry } from './decisionLogger'

export type SuggestionKind = 'add-rule' | 'disable-rule' | 'maintain'

export interface Suggestion {
  kind: SuggestionKind
  toolName?: string
  reasonExcerpt?: string
  ruleId?: string
  count: number
  message: string
}

export interface SuggestOptions {
  /** Only consider log entries within this many days. */
  windowDays: number
  /** Minimum repetitions before suggesting an add-rule. Default 3. */
  minPatternCount?: number
  /** Known deterministic rule ids to evaluate for stale-rule suggestions. */
  knownRuleIds?: string[]
}

interface PatternBucket {
  toolName: string
  reasonExcerpt: string
  count: number
}

function readEntries(logPath: string): DecisionLogEntry[] {
  if (!existsSync(logPath)) return []
  const content = readFileSync(logPath, 'utf-8')
  const out: DecisionLogEntry[] = []
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      out.push(JSON.parse(t) as DecisionLogEntry)
    } catch {
      // skip malformed
    }
  }
  return out
}

function withinWindow(timestamp: string, cutoff: number): boolean {
  const t = Date.parse(timestamp)
  if (Number.isNaN(t)) return false
  return t >= cutoff
}

function reasonKey(reason: string): string {
  // Group by the first ~80 chars of the reason; longer divergence
  // probably reflects per-call detail, not a distinct pattern.
  return reason.trim().slice(0, 80)
}

function trimExcerpt(reason: string): string {
  const trimmed = reason.trim()
  return trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed
}

export function suggestRules(
  logPath: string,
  options: SuggestOptions
): Suggestion[] {
  const entries = readEntries(logPath)
  if (entries.length === 0) return []

  const cutoff = Date.now() - options.windowDays * 86400_000
  const recent = entries.filter((e) =>
    typeof e.timestamp === 'string' && withinWindow(e.timestamp, cutoff)
  )
  const minCount = options.minPatternCount ?? 3
  const suggestions: Suggestion[] = []

  // add-rule: AI blocks that repeat
  const buckets = new Map<string, PatternBucket>()
  for (const e of recent) {
    if (e.decision !== 'block') continue
    if (e.source !== 'ai') continue
    const key = `${e.toolName}::${reasonKey(e.reason)}`
    const existing = buckets.get(key)
    if (existing) {
      existing.count++
    } else {
      buckets.set(key, {
        toolName: e.toolName,
        reasonExcerpt: trimExcerpt(e.reason),
        count: 1,
      })
    }
  }
  for (const b of buckets.values()) {
    if (b.count < minCount) continue
    suggestions.push({
      kind: 'add-rule',
      toolName: b.toolName,
      reasonExcerpt: b.reasonExcerpt,
      count: b.count,
      message: `The AI has blocked ${b.count} ${b.toolName} calls with this reason. Consider promoting it to a deterministic rule to skip the AI roundtrip.`,
    })
  }

  // disable-rule: known rules that did not fire in the window
  if (options.knownRuleIds && options.knownRuleIds.length > 0) {
    const firedRecent = new Set<string>()
    for (const e of recent) {
      if (e.source === 'deterministic' && e.ruleId) {
        firedRecent.add(e.ruleId)
      }
    }
    for (const rid of options.knownRuleIds) {
      if (firedRecent.has(rid)) continue
      suggestions.push({
        kind: 'disable-rule',
        ruleId: rid,
        count: 0,
        message: `Rule "${rid}" has not fired in the last ${options.windowDays} days. If your project never triggers it, you can disable it in .agent-gate.config.{ts,json} to reduce noise.`,
      })
    }
  }

  return suggestions
}

export function formatSuggestions(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return 'No suggestions. Nothing to do.'
  }
  const lines: string[] = []
  let i = 1
  for (const s of suggestions) {
    if (s.kind === 'add-rule') {
      lines.push(
        `${i}. [add-rule] ${s.toolName ?? '?'} blocked ${s.count} times`
      )
      if (s.reasonExcerpt) {
        lines.push(`   reason: ${s.reasonExcerpt}`)
      }
      lines.push(`   ${s.message}`)
    } else if (s.kind === 'disable-rule') {
      lines.push(`${i}. [disable-rule] ${s.ruleId ?? '?'} (0 fires)`)
      lines.push(`   ${s.message}`)
    } else {
      lines.push(`${i}. [${s.kind}] ${s.message}`)
    }
    lines.push('')
    i++
  }
  lines.push(`${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}.`)
  return lines.join('\n')
}
