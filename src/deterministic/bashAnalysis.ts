/**
 * Light-weight bash analysis utilities used by deterministic rules to
 * see past common obfuscation patterns. This is intentionally not a
 * full shell parser; it handles the cases that matter for guardrails
 * (separators, quoting, heredoc redirects, command substitution
 * markers) and stays small.
 */

/**
 * Split a command line into top-level statements separated by `;`,
 * `&&`, `||`, `|`, or newline. Respects single- and double-quoted
 * regions so separators inside strings are preserved as part of the
 * statement.
 *
 * Trims and drops empty results.
 */
export function splitStatements(command: string): string[] {
  const out: string[] = []
  let buf = ''
  let i = 0
  let quote: '"' | "'" | null = null

  while (i < command.length) {
    const c = command[i]

    if (quote) {
      buf += c
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      buf += c
      i++
      continue
    }

    if (c === ';' || c === '\n' || c === '|') {
      // `||` collapses with `|`; `&&` handled below.
      out.push(buf)
      buf = ''
      i++
      // collapse a trailing | of `||`
      if (c === '|' && command[i] === '|') i++
      continue
    }
    if (c === '&' && command[i + 1] === '&') {
      out.push(buf)
      buf = ''
      i += 2
      continue
    }

    buf += c
    i++
  }
  out.push(buf)
  return out.map((s) => s.trim()).filter((s) => s.length > 0)
}

/**
 * Return any redirect targets that follow a heredoc operator. Each
 * `cat <<EOF > target` (or `>> target`) anywhere in the command
 * contributes one entry. Returns the raw target token without quote
 * stripping.
 */
export function extractHeredocTargets(command: string): string[] {
  const targets: string[] = []
  // `<<` or `<<-`, optional `'TAG'` or `"TAG"` or bare TAG, then a redirect.
  // We are permissive about whitespace.
  const re = /<<-?\s*(?:['"]?\w+['"]?)\s*(?:>>?)\s*([^\s;|&<>]+)/g
  for (const m of command.matchAll(re)) {
    if (m[1]) targets.push(m[1])
  }
  return targets
}

const KNOWN_LITERAL_VARS = new Set([
  '$HOME',
  '${HOME}',
  '$PWD',
  '${PWD}',
  '$USER',
  '${USER}',
])

/**
 * True when the command uses command substitution `$(...)` / backticks,
 * or a non-literal variable reference (anything other than the well-
 * known `$HOME` / `$USER` / `$PWD` which the catastrophic-path rule
 * already understands).
 */
export function hasObfuscation(command: string): boolean {
  if (/\$\([^)]*\)/.test(command)) return true
  if (/`[^`]*`/.test(command)) return true

  // Match each $VAR / ${VAR} occurrence and decide whether it is one
  // of the literal allowlist.
  const re = /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g
  for (const m of command.matchAll(re)) {
    const tok = m[0]
    if (!KNOWN_LITERAL_VARS.has(tok)) return true
  }
  return false
}
