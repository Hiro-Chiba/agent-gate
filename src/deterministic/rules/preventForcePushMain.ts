import { DeterministicRule, RuleVerdict } from '../types'

const PROTECTED_BRANCHES = new Set([
  'main',
  'master',
  'develop',
  'development',
  'production',
  'prod',
  'release',
  'stable',
])

function isGitPush(tokens: string[]): boolean {
  const gitIdx = tokens.indexOf('git')
  if (gitIdx === -1) return false
  return tokens[gitIdx + 1] === 'push'
}

function hasForceFlag(tokens: string[]): boolean {
  for (const token of tokens) {
    if (token === '--force-with-lease') continue
    if (token.startsWith('--force-with-lease=')) continue
    if (token === '--force' || token === '-f') return true
  }
  return false
}

function targetsProtectedBranch(tokens: string[]): boolean {
  for (const token of tokens) {
    // git push origin +main  → plus-prefixed force on protected branch
    if (token.startsWith('+')) {
      const branch = token.slice(1).split(':').pop() ?? ''
      if (PROTECTED_BRANCHES.has(branch)) return true
    }
    // git push origin main  or  git push origin main:main
    if (PROTECTED_BRANCHES.has(token)) return true
    if (token.includes(':')) {
      const dest = token.split(':').pop() ?? ''
      if (PROTECTED_BRANCHES.has(dest)) return true
    }
  }
  return false
}

function hasPlusPrefixedProtected(tokens: string[]): boolean {
  for (const token of tokens) {
    if (!token.startsWith('+')) continue
    const branch = token.slice(1).split(':').pop() ?? ''
    if (PROTECTED_BRANCHES.has(branch)) return true
  }
  return false
}

export const preventForcePushMain: DeterministicRule = {
  id: 'prevent-force-push-main',
  check(toolName, toolInput): RuleVerdict {
    if (toolName !== 'Bash') return { kind: 'allow' }
    const command = toolInput.command
    if (typeof command !== 'string') return { kind: 'allow' }

    const tokens = command.trim().split(/\s+/)
    if (!isGitPush(tokens)) return { kind: 'allow' }

    const force = hasForceFlag(tokens)
    const plusForce = hasPlusPrefixedProtected(tokens)

    if (!force && !plusForce) return { kind: 'allow' }
    if (!targetsProtectedBranch(tokens)) return { kind: 'allow' }

    return {
      kind: 'block',
      reason:
        'Force push to a protected branch is blocked. Use --force-with-lease if you really need to overwrite history, or push to a feature branch instead.',
    }
  },
}
