import { DeterministicRule } from '../deterministic/types'

/**
 * Shape of the object exported by `.agent-gate.config.{ts,js,mjs}`.
 *
 * All fields are optional. The plugin loader resolves precedence with
 * existing `.agent-gate.json` (the richer config file wins on conflict).
 */
export interface AgentGatePluginConfig {
  /** Internal: whether a config file was found on disk. Used for opt-in. */
  found?: boolean
  /**
   * Internal: absolute path of the config file that was loaded. Populated
   * by `loadPluginConfig` when a file is found. Not set by user-authored
   * `defineConfig(...)` calls.
   */
  configPath?: string
  /**
   * Internal: error captured while loading the config file (eg. a syntax
   * error in `.agent-gate.config.ts`). The pipeline continues with an
   * empty config, but `doctor`-style tooling can surface this so the
   * user is not left wondering why their rules stopped firing. Not set
   * by user-authored `defineConfig(...)` calls.
   */
  error?: Error
  /** Rule ids that should not run. Merged with AGENT_GATE_DISABLED_RULES. */
  disabledRules?: string[]
  /** Override the protected branch list used by prevent-force-push-main. */
  protectedBranches?: string[]
  /** Additional path substrings treated as secret targets. */
  extraSecretPathPrefixes?: string[]
  /** User-defined deterministic rules appended after the built-ins. */
  customRules?: DeterministicRule[]
}

/**
 * Identity helper that gives TypeScript users autocomplete and type
 * checking inside `.agent-gate.config.ts`. Has no runtime behavior.
 */
export function defineConfig(
  config: AgentGatePluginConfig
): AgentGatePluginConfig {
  return config
}
