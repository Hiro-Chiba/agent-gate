import { PipelineEvent, Sink } from './sinks/Sink'

/**
 * Tiny synchronous event bus for the pipeline. Sinks subscribe at
 * pipeline construction time and receive every event emitted.
 *
 * The bus catches sink exceptions so a broken sink can never bring
 * down the hook. Async sinks are allowed but the bus does not await
 * them; observability is fire-and-forget by design.
 */
export class EventBus {
  private readonly sinks: Sink[] = []

  subscribe(sink: Sink): void {
    this.sinks.push(sink)
  }

  emit(event: PipelineEvent): void {
    for (const sink of this.sinks) {
      try {
        const r = sink.handle(event)
        if (r instanceof Promise) {
          r.catch(() => {
            // swallow async sink failures
          })
        }
      } catch {
        // swallow sync sink failures
      }
    }
  }
}
