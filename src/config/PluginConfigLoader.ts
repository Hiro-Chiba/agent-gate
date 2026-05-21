import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { createJiti } from 'jiti'
import { AgentGatePluginConfig } from './defineConfig'

const CANDIDATE_FILENAMES = [
  '.agent-gate.config.ts',
  '.agent-gate.config.mts',
  '.agent-gate.config.mjs',
  '.agent-gate.config.cjs',
  '.agent-gate.config.js',
]
const LEGACY_JSON_FILENAME = '.agent-gate.json'

function findConfigFile(cwd: string): string | null {
  let dir = cwd
  while (true) {
    for (const name of CANDIDATE_FILENAMES) {
      const p = join(dir, name)
      if (existsSync(p)) return p
    }
    const legacy = join(dir, LEGACY_JSON_FILENAME)
    if (existsSync(legacy)) return legacy
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

interface RawJsonConfig {
  disabled_rules?: string[]
  protected_branches?: string[]
  extra_secret_paths?: string[]
}

interface LoadResult {
  config: AgentGatePluginConfig
  error?: Error
}

function normalizeFromJson(raw: RawJsonConfig): AgentGatePluginConfig {
  return {
    disabledRules: Array.isArray(raw.disabled_rules)
      ? raw.disabled_rules
      : undefined,
    protectedBranches: Array.isArray(raw.protected_branches)
      ? raw.protected_branches
      : undefined,
    extraSecretPathPrefixes: Array.isArray(raw.extra_secret_paths)
      ? raw.extra_secret_paths
      : undefined,
  }
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

function loadJsonFile(path: string): LoadResult {
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content) as unknown
    if (typeof parsed !== 'object' || parsed === null) return { config: {} }
    return { config: normalizeFromJson(parsed as RawJsonConfig) }
  } catch (e) {
    return { config: {}, error: toError(e) }
  }
}

function loadJsTsFile(path: string): LoadResult {
  try {
    const jiti = createJiti(path, { interopDefault: true })
    const mod = jiti(path) as unknown
    if (typeof mod !== 'object' || mod === null) return { config: {} }
    // `interopDefault: true` unwraps `default` for ESM. Some configs
    // still export raw modules; treat both as the config.
    const inner =
      'default' in (mod as Record<string, unknown>) &&
      (mod as Record<string, unknown>).default !== undefined
        ? (mod as Record<string, unknown>).default
        : mod
    if (typeof inner !== 'object' || inner === null) return { config: {} }
    return { config: inner as AgentGatePluginConfig }
  } catch (e) {
    return { config: {}, error: toError(e) }
  }
}

export function loadPluginConfig(cwd: string): AgentGatePluginConfig {
  const path = findConfigFile(cwd)
  if (!path) return { found: false }
  const { config, error } = path.endsWith('.json')
    ? loadJsonFile(path)
    : loadJsTsFile(path)
  return {
    ...config,
    found: true,
    configPath: path,
    ...(error ? { error } : {}),
  }
}
