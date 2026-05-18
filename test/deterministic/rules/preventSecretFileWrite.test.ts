import { describe, it, expect } from 'vitest'
import { preventSecretFileWrite } from '../../../src/deterministic/rules/preventSecretFileWrite'

describe('preventSecretFileWrite', () => {
  it('blocks Write to .env', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/project/.env',
      content: 'API_KEY=secret',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Gemini CLI write_file to .env', () => {
    const verdict = preventSecretFileWrite.check('write_file', {
      file_path: '/project/.env',
      content: 'API_KEY=secret',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Gemini CLI replace to .env', () => {
    const verdict = preventSecretFileWrite.check('replace', {
      file_path: '/project/.env',
      old_string: 'a',
      new_string: 'b',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Edit to .env.local', () => {
    const verdict = preventSecretFileWrite.check('Edit', {
      file_path: '/project/.env.local',
      old_string: 'a',
      new_string: 'b',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Write to .env.production', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/project/.env.production',
      content: '',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Write to ~/.ssh/id_rsa', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/Users/me/.ssh/id_rsa',
      content: '',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Write to .aws/credentials', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/Users/me/.aws/credentials',
      content: '',
    })
    expect(verdict.kind).toBe('block')
  })

  it('blocks Write to a .pem file', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/project/server.pem',
      content: '',
    })
    expect(verdict.kind).toBe('block')
  })

  it('allows Write to a regular source file', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/project/src/index.ts',
      content: 'export const x = 1',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows Write to .env.example (template, not a real secret)', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/project/.env.example',
      content: 'API_KEY=your-key-here',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows Write to .env.sample (template)', () => {
    const verdict = preventSecretFileWrite.check('Write', {
      file_path: '/project/.env.sample',
      content: '',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows Bash tools regardless of input', () => {
    const verdict = preventSecretFileWrite.check('Bash', {
      command: 'echo hi > /project/.env',
    })
    expect(verdict.kind).toBe('allow')
  })

  it('allows when file_path is missing', () => {
    const verdict = preventSecretFileWrite.check('Write', { content: '' })
    expect(verdict.kind).toBe('allow')
  })
})
