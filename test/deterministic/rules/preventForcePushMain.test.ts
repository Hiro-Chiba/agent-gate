import { describe, it, expect } from 'vitest'
import { preventForcePushMain } from '../../../src/deterministic/rules/preventForcePushMain'

describe('preventForcePushMain', () => {
  it('blocks `git push --force origin main` via Bash', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push --force origin main',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks `git push --force origin main` via Gemini CLI run_shell_command', () => {
    const verdict = preventForcePushMain.check('run_shell_command', {
      command: 'git push --force origin main',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks `git push -f origin master`', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push -f origin master',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks `git push --force origin develop`', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push --force origin develop',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks plus-prefixed force push `git push origin +main`', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push origin +main',
    })
    expect(verdict.kind).toBe('block')
  })

  it('allows `git push --force-with-lease origin main` (safe variant)', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push --force-with-lease origin main',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows `git push --force origin feature/x`', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push --force origin feature/x',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows normal `git push origin main` (non-force)', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git push origin main',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows non-push git commands `git status`', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'git status',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows non-git commands', () => {
    const verdict = preventForcePushMain.check('Bash', {
      command: 'ls',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows non-Bash tools', () => {
    const verdict = preventForcePushMain.check('Edit', {
      command: 'git push --force origin main',
    })
    expect(verdict.kind).toBe('allow')
  })
})
