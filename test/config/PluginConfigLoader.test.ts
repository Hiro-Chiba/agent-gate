import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadPluginConfig } from '../../src/config/PluginConfigLoader'

const ROOT = join(__dirname, '..', '..', 'tmp', 'test-plugin-config')

function freshDir(name: string): string {
  const dir = join(ROOT, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('loadPluginConfig', () => {
  beforeEach(() => {
    mkdirSync(ROOT, { recursive: true })
  })

  afterEach(() => {
    rmSync(ROOT, { recursive: true, force: true })
  })

  it('returns an empty config when no file exists', () => {
    const dir = freshDir('empty')
    const cfg = loadPluginConfig(dir)
    expect(cfg.disabledRules ?? []).toEqual([])
    expect(cfg.customRules ?? []).toEqual([])
  })

  it('loads a .agent-gate.config.js file via CommonJS export', () => {
    const dir = freshDir('cjs')
    writeFileSync(
      join(dir, '.agent-gate.config.js'),
      `module.exports = {
         disabledRules: ['prevent-rm-rf-root'],
         protectedBranches: ['main', 'release'],
       }`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.disabledRules).toEqual(['prevent-rm-rf-root'])
    expect(cfg.protectedBranches).toEqual(['main', 'release'])
  })

  it('loads a .agent-gate.config.mjs file via default ESM export', () => {
    const dir = freshDir('mjs')
    writeFileSync(
      join(dir, '.agent-gate.config.mjs'),
      `export default {
         disabledRules: ['prevent-system-path-write'],
       }`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.disabledRules).toEqual(['prevent-system-path-write'])
  })

  it('loads a .agent-gate.config.ts file with an inline custom rule', () => {
    const dir = freshDir('ts')
    writeFileSync(
      join(dir, '.agent-gate.config.ts'),
      `export default {
         customRules: [{
           id: 'no-drop',
           check: (toolName, toolInput) => {
             if (toolName === 'Bash' && typeof toolInput.command === 'string' &&
                 /drop\\s+table/i.test(toolInput.command)) {
               return { kind: 'block', reason: 'no drop' }
             }
             return { kind: 'allow' }
           }
         }]
       }`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.customRules).toHaveLength(1)
    expect(cfg.customRules![0].id).toBe('no-drop')
    expect(
      cfg.customRules![0].check('Bash', { command: 'DROP TABLE users' }).kind
    ).toBe('block')
  })

  it('falls back to .agent-gate.json when no JS/TS config is present', () => {
    const dir = freshDir('json')
    writeFileSync(
      join(dir, '.agent-gate.json'),
      JSON.stringify({ disabled_rules: ['prevent-force-push-main'] })
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.disabledRules).toEqual(['prevent-force-push-main'])
  })

  it('prefers .agent-gate.config.ts over .agent-gate.json when both exist', () => {
    const dir = freshDir('priority')
    writeFileSync(
      join(dir, '.agent-gate.json'),
      JSON.stringify({ disabled_rules: ['from-json'] })
    )
    writeFileSync(
      join(dir, '.agent-gate.config.ts'),
      `export default { disabledRules: ['from-ts'] }`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.disabledRules).toEqual(['from-ts'])
  })

  it('walks upward to find the config in a parent directory', () => {
    const dir = freshDir('walk')
    const sub = join(dir, 'a', 'b')
    mkdirSync(sub, { recursive: true })
    writeFileSync(
      join(dir, '.agent-gate.config.js'),
      `module.exports = { disabledRules: ['parent-rule'] }`
    )
    const cfg = loadPluginConfig(sub)
    expect(cfg.disabledRules).toEqual(['parent-rule'])
  })

  it('returns empty config when the file throws on load', () => {
    const dir = freshDir('throw')
    writeFileSync(
      join(dir, '.agent-gate.config.js'),
      `throw new Error('bad config')`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.disabledRules ?? []).toEqual([])
  })

  it('reports configPath when a file is loaded', () => {
    const dir = freshDir('config-path')
    const filePath = join(dir, '.agent-gate.config.js')
    writeFileSync(filePath, `module.exports = { disabledRules: ['x'] }`)
    const cfg = loadPluginConfig(dir)
    expect(cfg.configPath).toBe(filePath)
  })

  it('omits configPath when no file is found anywhere up the tree', () => {
    // Walk up from the OS tmpdir, which is outside the developer's hobby
    // tree, so this assertion is not polluted by ambient .agent-gate.json
    // files in the user's home directory hierarchy.
    const isolated = mkdtempSync(join(tmpdir(), 'agent-gate-no-config-'))
    try {
      const cfg = loadPluginConfig(isolated)
      expect(cfg.configPath).toBeUndefined()
      expect(cfg.found).toBe(false)
    } finally {
      rmSync(isolated, { recursive: true, force: true })
    }
  })

  it('captures the underlying error when a .ts/.js config throws on load', () => {
    const dir = freshDir('error-capture-js')
    writeFileSync(
      join(dir, '.agent-gate.config.js'),
      `throw new Error('boom from config')`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.error).toBeInstanceOf(Error)
    expect(cfg.error?.message).toContain('boom from config')
    // Still flagged as found so the pipeline does not silently opt-out.
    expect(cfg.found).toBe(true)
    expect(cfg.configPath).toBe(join(dir, '.agent-gate.config.js'))
  })

  it('captures the underlying error when a .json config is malformed', () => {
    const dir = freshDir('error-capture-json')
    writeFileSync(join(dir, '.agent-gate.json'), '{ this is not json')
    const cfg = loadPluginConfig(dir)
    expect(cfg.error).toBeInstanceOf(Error)
    expect(cfg.found).toBe(true)
    expect(cfg.configPath).toBe(join(dir, '.agent-gate.json'))
  })

  it('does not set error on a successful load', () => {
    const dir = freshDir('no-error-on-success')
    writeFileSync(
      join(dir, '.agent-gate.config.js'),
      `module.exports = { disabledRules: ['ok'] }`
    )
    const cfg = loadPluginConfig(dir)
    expect(cfg.error).toBeUndefined()
  })
})
