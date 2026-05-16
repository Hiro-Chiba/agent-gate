export const DEFAULT_MODEL = 'claude-sonnet-4-6'

export type ConfigOptions = {
  model?: string
  apiKey?: string
  cooldown?: number
  disabled?: boolean
  useSystemClaude?: boolean
}

export class Config {
  readonly model: string
  readonly apiKey: string | undefined
  readonly cooldown: number
  readonly disabled: boolean
  readonly useSystemClaude: boolean

  constructor(options?: ConfigOptions) {
    this.model = options?.model ?? process.env.AGENT_GATE_MODEL ?? DEFAULT_MODEL
    this.apiKey = options?.apiKey ?? process.env.AGENT_GATE_API_KEY
    const parsedCooldown = parseInt(process.env.AGENT_GATE_COOLDOWN ?? '0', 10)
    this.cooldown = options?.cooldown ?? (Number.isNaN(parsedCooldown) ? 0 : parsedCooldown)
    this.disabled = options?.disabled ?? process.env.AGENT_GATE_DISABLED === 'true'
    this.useSystemClaude = options?.useSystemClaude ?? process.env.USE_SYSTEM_CLAUDE === 'true'
  }

  get useApi(): boolean {
    return this.apiKey !== undefined && this.apiKey !== ''
  }
}
