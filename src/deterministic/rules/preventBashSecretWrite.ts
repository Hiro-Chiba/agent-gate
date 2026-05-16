import { DeterministicRule, RuleVerdict } from '../types'
import { extractHeredocTargets, splitStatements } from '../bashAnalysis'

const TEMPLATE_SUFFIXES = ['.example', '.sample', '.template', '.dist']

function basename(path: string): string {
  const cleaned = path.replace(/[\s'"]+$/, '')
  const idx = cleaned.lastIndexOf('/')
  return idx >= 0 ? cleaned.slice(idx + 1) : cleaned
}

function isTemplate(path: string): boolean {
  return TEMPLATE_SUFFIXES.some((s) => path.endsWith(s))
}

function isSecretTargetPath(rawPath: string): boolean {
  const cleaned = rawPath.replace(/^['"]|['"]$/g, '').trim()
  if (isTemplate(cleaned)) return false

  const name = basename(cleaned)

  if (name === '.env' || name.startsWith('.env.')) return true
  if (cleaned.includes('/.ssh/')) return true
  if (/\/\.aws\/(credentials|config)$/.test(cleaned)) return true
  if (/\.(pem|key)$/.test(name)) return true
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/.test(name)) return true
  if (name === '.netrc') return true

  return false
}

/**
 * Extracts every file the command writes to:
 *   1. Standard redirects (`>`, `>>`, `1>`, `2>`, `&>`)
 *   2. `tee [-a] FILE [FILE ...]`
 *   3. Heredoc redirects (`cat <<EOF > file`)
 */
function extractWriteTargets(command: string): string[] {
  const targets: string[] = []

  const redirectRe = /[12&]?>>?\s*([^\s;|&<>]+)/g
  for (const m of command.matchAll(redirectRe)) {
    if (m[1]) targets.push(m[1])
  }

  const teeRe = /\btee\b(?:\s+-[A-Za-z]+)*\s+([^\s;|&<>]+(?:\s+[^\s;|&<>]+)*)/g
  for (const m of command.matchAll(teeRe)) {
    if (m[1]) {
      for (const f of m[1].split(/\s+/)) {
        if (f && !f.startsWith('-')) targets.push(f)
      }
    }
  }

  for (const t of extractHeredocTargets(command)) {
    targets.push(t)
  }

  return targets
}

export const preventBashSecretWrite: DeterministicRule = {
  id: 'prevent-bash-secret-write',
  check(toolName, toolInput): RuleVerdict {
    if (toolName !== 'Bash') return { kind: 'allow' }
    const command = toolInput.command
    if (typeof command !== 'string') return { kind: 'allow' }

    // Inspect each top-level statement; heredoc spans newlines so the
    // statement splitter preserves the heredoc body inside its segment.
    for (const stmt of splitStatements(command)) {
      const targets = extractWriteTargets(stmt)
      for (const target of targets) {
        if (isSecretTargetPath(target)) {
          return {
            kind: 'block',
            reason: `Refusing to write to a likely secret/credential file via shell redirect: ${target}. If this is intentional, run the command manually outside of the agent.`,
          }
        }
      }
    }
    return { kind: 'allow' }
  },
}
