import { PipelineEvent, Sink } from './Sink'
import {
  appendDecision,
  DecisionLogEntry,
} from '../decisionLogger'

/**
 * Persists verdict.decided events to a JSONL file (one event per line).
 * Other event types are dropped. The output shape matches the legacy
 * DecisionLogEntry so existing log readers and the `agent-gate stats`
 * subcommand continue to work unchanged.
 */
export class JsonlFileSink implements Sink {
  constructor(private readonly path: string) {}

  handle(event: PipelineEvent): void {
    if (event.type !== 'verdict.decided') return
    const entry: DecisionLogEntry = {
      timestamp: new Date().toISOString(),
      adapter: event.adapter,
      toolName: event.toolName,
      decision: event.decision,
      reason: event.reason,
      source: event.source,
      ruleId: event.ruleId,
    }
    try {
      appendDecision(entry, this.path)
    } catch {
      // sink swallows its own failures per Sink contract
    }
  }
}
