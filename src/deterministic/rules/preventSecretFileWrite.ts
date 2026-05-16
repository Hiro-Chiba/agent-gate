import { DeterministicRule, RuleVerdict } from '../types'

const TOOLS_THAT_WRITE = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

const TEMPLATE_SUFFIXES = ['.example', '.sample', '.template', '.dist']

function basename(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx >= 0 ? path.slice(idx + 1) : path
}

function isTemplate(filePath: string): boolean {
  return TEMPLATE_SUFFIXES.some((suffix) => filePath.endsWith(suffix))
}

function isSecretPath(filePath: string): boolean {
  if (isTemplate(filePath)) return false

  const name = basename(filePath)

  // .env, .env.local, .env.production, etc. (but not .env.example etc.)
  if (name === '.env' || name.startsWith('.env.')) {
    return true
  }

  // Any file under .ssh/
  if (filePath.includes('/.ssh/')) {
    return true
  }

  // .aws/credentials and .aws/config
  if (/\/\.aws\/(credentials|config)$/.test(filePath)) {
    return true
  }

  // Private key file extensions
  if (/\.(pem|key)$/.test(name)) {
    return true
  }

  // Common private key filenames
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/.test(name)) {
    return true
  }

  // .netrc
  if (name === '.netrc') {
    return true
  }

  return false
}

export const preventSecretFileWrite: DeterministicRule = {
  id: 'prevent-secret-file-write',
  check(toolName, toolInput): RuleVerdict {
    if (!TOOLS_THAT_WRITE.has(toolName)) return { kind: 'allow' }
    const filePath = toolInput.file_path
    if (typeof filePath !== 'string') return { kind: 'allow' }
    if (!isSecretPath(filePath)) return { kind: 'allow' }

    return {
      kind: 'block',
      reason: `Refusing to write to a likely secret/credential file: ${filePath}. If this is intentional, edit the file outside of the agent.`,
    }
  },
}
