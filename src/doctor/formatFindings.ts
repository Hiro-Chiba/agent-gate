import { Finding } from './findings'

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
}

function groupByPath(findings: Finding[]): Record<string, Finding[]> {
  const out: Record<string, Finding[]> = {}
  for (const f of findings) {
    if (!out[f.ruleSourcePath]) out[f.ruleSourcePath] = []
    out[f.ruleSourcePath].push(f)
  }
  return out
}

export function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) {
    return 'No issues found. 0 findings.'
  }

  const lines: string[] = []
  const grouped = groupByPath(findings)
  for (const path of Object.keys(grouped).sort()) {
    lines.push(path)
    for (const f of grouped[path]) {
      const loc = f.line !== undefined ? ` (line ${f.line})` : ''
      const excerpt =
        f.excerpt !== undefined && f.excerpt.length > 0
          ? `\n      > ${f.excerpt}`
          : ''
      lines.push(
        `  [${SEVERITY_LABEL[f.severity]}] ${f.code}${loc}: ${f.message}${excerpt}`
      )
    }
    lines.push('')
  }
  lines.push(`${findings.length} finding${findings.length === 1 ? '' : 's'}.`)
  return lines.join('\n')
}
