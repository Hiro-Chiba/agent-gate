/**
 * Normalized representation of a pre-tool-use event from any AI coding tool.
 * Adapters convert vendor-specific hook payloads into this shape so that the
 * deterministic engine and AI validator can run unchanged regardless of
 * which agent fired the hook.
 */
export interface Action {
  toolName: string
  toolInput: Record<string, unknown>
  /** 
   * Absolute path to the session transcript/log file, if provided by the 
   * agent's hook payload.
   */
  transcriptPath?: string
  /** 
   * Extra vendor-specific metadata extracted from the hook payload.
   */
  metadata?: Record<string, unknown>
}

/**
 * Result of parsing a hook payload. An adapter may yield an Action when the
 * payload represents a pre-tool-use event we care about, or a Skip when the
 * payload is not a relevant event (post-event, unrecognized shape, disabled).
 */
export type ParsedHook =
  | { kind: 'action'; action: Action }
  | { kind: 'skip'; reason: string }
