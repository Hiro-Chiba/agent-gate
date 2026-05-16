import { describe, it, expect } from 'vitest'
import { EventBus } from '../../src/observability/eventBus'
import {
  PipelineEvent,
  Sink,
} from '../../src/observability/sinks/Sink'

function collector(events: PipelineEvent[]): Sink {
  return { handle: (e) => void events.push(e) }
}

describe('EventBus', () => {
  it('emits events to every subscribed sink', () => {
    const bus = new EventBus()
    const a: PipelineEvent[] = []
    const b: PipelineEvent[] = []
    bus.subscribe(collector(a))
    bus.subscribe(collector(b))

    bus.emit({
      type: 'verdict.decided',
      adapter: 'claude-code',
      toolName: 'Bash',
      decision: 'allow',
      reason: '',
      source: 'pass',
    })

    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(a[0].type).toBe('verdict.decided')
  })

  it('isolates a throwing sink from the rest', () => {
    const bus = new EventBus()
    bus.subscribe({
      handle: () => {
        throw new Error('sink boom')
      },
    })
    const tail: PipelineEvent[] = []
    bus.subscribe(collector(tail))

    bus.emit({
      type: 'rule.fired',
      adapter: 'claude-code',
      toolName: 'Bash',
      ruleId: 'x',
      decision: 'block',
      reason: 'r',
    })

    expect(tail).toHaveLength(1)
  })

  it('does nothing when no sinks are subscribed', () => {
    const bus = new EventBus()
    expect(() =>
      bus.emit({
        type: 'pipeline.error',
        stage: 'unit-test',
        error: 'none',
      })
    ).not.toThrow()
  })
})
