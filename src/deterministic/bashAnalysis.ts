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
  // Active heredoc terminator. When set, we copy bytes verbatim until a
  // line consisting solely of this tag (with optional leading whitespace
  // when `stripIndent` is true) is encountered.
  let heredoc: { tag: string; stripIndent: boolean } | null = null

  function atLineStart(): boolean {
    return buf.length === 0 || buf[buf.length - 1] === '\n'
  }

  while (i < command.length) {
    const c = command[i]

    // Heredoc body: copy until terminator line. Separators inside the
    // body are content, not statement boundaries.
    if (heredoc) {
      buf += c
      if (c === '\n') {
        // Check if the next line is the terminator.
        let j = i + 1
        if (heredoc.stripIndent) {
          while (j < command.length && (command[j] === '\t' || command[j] === ' ')) j++
        }
        const slice = command.slice(j, j + heredoc.tag.length)
        const after = command[j + heredoc.tag.length]
        if (slice === heredoc.tag && (after === undefined || after === '\n')) {
          // Consume the terminator line as part of the current statement.
          if (heredoc.stripIndent) {
            buf += command.slice(i + 1, j)
          }
          buf += heredoc.tag
          i = j + heredoc.tag.length
          heredoc = null
          continue
        }
      }
      i++
      continue
    }

    // Detect heredoc opener `<<TAG`, `<<-TAG`, `<<'TAG'`, `<<"TAG"`.
    if (!quote && c === '<' && command[i + 1] === '<' && command[i + 2] !== '<') {
      let j = i + 2
      let stripIndent = false
      if (command[j] === '-') {
        stripIndent = true
        j++
      }
      // Skip whitespace between `<<` (or `<<-`) and the tag.
      while (command[j] === ' ' || command[j] === '\t') j++
      let tagQuote: '"' | "'" | null = null
      if (command[j] === '"' || command[j] === "'") {
        tagQuote = command[j] as '"' | "'"
        j++
      }
      const tagStart = j
      while (j < command.length && /[A-Za-z0-9_]/.test(command[j])) j++
      const tag = command.slice(tagStart, j)
      if (tagQuote && command[j] === tagQuote) j++
      if (tag.length > 0) {
        // Copy through the opener so the source remains intact in buf.
        buf += command.slice(i, j)
        i = j
        heredoc = { tag, stripIndent }
        continue
      }
    }

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
      out.push(buf)
      buf = ''
      i++
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
