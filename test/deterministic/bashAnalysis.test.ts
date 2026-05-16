import { describe, it, expect } from 'vitest'
import {
  splitStatements,
  extractHeredocTargets,
  hasObfuscation,
} from '../../src/deterministic/bashAnalysis'

describe('splitStatements', () => {
  it('splits on semicolon', () => {
    expect(splitStatements('a ; b')).toEqual(['a', 'b'])
  })

  it('splits on && and ||', () => {
    expect(splitStatements('a && b || c')).toEqual(['a', 'b', 'c'])
  })

  it('splits on newline', () => {
    expect(splitStatements('a\nb')).toEqual(['a', 'b'])
  })

  it('does not split inside single-quoted strings', () => {
    expect(splitStatements("echo 'a ; b' ; ls")).toEqual([
      "echo 'a ; b'",
      'ls',
    ])
  })

  it('does not split inside double-quoted strings', () => {
    expect(splitStatements('echo "a && b" && ls')).toEqual([
      'echo "a && b"',
      'ls',
    ])
  })

  it('returns a single statement when there are no separators', () => {
    expect(splitStatements('ls -la')).toEqual(['ls -la'])
  })

  it('trims and drops empty segments', () => {
    expect(splitStatements('  a ;  ; b ')).toEqual(['a', 'b'])
  })

  it('splits on pipe but preserves data flow intent for analysis', () => {
    expect(splitStatements('cat .env | grep secret')).toEqual([
      'cat .env',
      'grep secret',
    ])
  })
})

describe('extractHeredocTargets', () => {
  it('finds the redirect target of a heredoc', () => {
    expect(extractHeredocTargets('cat <<EOF > .env\nx\nEOF')).toEqual([
      '.env',
    ])
  })

  it('finds heredoc append target', () => {
    expect(
      extractHeredocTargets('cat <<EOF >> .env.production\nx\nEOF')
    ).toEqual(['.env.production'])
  })

  it('handles heredoc with quoted delimiter', () => {
    expect(extractHeredocTargets("cat <<'EOF' > .env\nx\nEOF")).toEqual([
      '.env',
    ])
  })

  it('returns empty array when no heredoc present', () => {
    expect(extractHeredocTargets('echo hello > .env')).toEqual([])
  })

  it('finds heredoc on the same line', () => {
    expect(extractHeredocTargets('cat <<DONE > /tmp/x\nDONE')).toEqual([
      '/tmp/x',
    ])
  })
})

describe('hasObfuscation', () => {
  it('detects $(...) command substitution', () => {
    expect(hasObfuscation('rm -rf $(echo /)')).toBe(true)
  })

  it('detects backtick command substitution', () => {
    expect(hasObfuscation('rm -rf `echo /`')).toBe(true)
  })

  it('detects unresolved variable references', () => {
    expect(hasObfuscation('rm -rf $TARGET')).toBe(true)
  })

  it('detects ${VAR} form', () => {
    expect(hasObfuscation('rm -rf ${TARGET}')).toBe(true)
  })

  it('does not flag literal $HOME (already handled as catastrophic constant)', () => {
    expect(hasObfuscation('rm -rf $HOME')).toBe(false)
  })

  it('returns false for plain literal commands', () => {
    expect(hasObfuscation('rm -rf /tmp/foo')).toBe(false)
  })
})
