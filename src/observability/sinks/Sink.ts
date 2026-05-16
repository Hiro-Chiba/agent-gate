export interface RuleFiredEvent {
  type: 'rule.fired'
  adapter: string
  toolName: string
  ruleId: string
  decision: 'block' | 'allow'
  reason: string
}

export interface AiRequestedEvent {
  type: 'ai.requested'
  adapter: string
  toolName: string
  rulesCount: number
}

export interface AiCompletedEvent {
  type: 'ai.completed'
  adapter: string
  toolName: string
  decision: 'block' | 'allow'
  reason: string
  latencyMs: number
}

export interface VerdictDecidedEvent {
  type: 'verdict.decided'
  adapter: string
  toolName: string
  decision: 'block' | 'allow'
  reason: string
  source: 'deterministic' | 'ai' | 'pass'
  ruleId?: string
}

export interface PipelineErrorEvent {
  type: 'pipeline.error'
  stage: string
  error: string
}

export type PipelineEvent =
  | RuleFiredEvent
  | AiRequestedEvent
  | AiCompletedEvent
  | VerdictDecidedEvent
  | PipelineErrorEvent

export interface Sink {
  /**
   * Handle a single pipeline event. Sinks must be defensive: throwing
   * here is caught by the EventBus and does not affect other sinks
   * or the pipeline.
   */
  handle(event: PipelineEvent): void | Promise<void>
}
