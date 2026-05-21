# Config and custom rules

agent-gate is strictly opt-in: it does nothing until you place an `.agent-gate.config.*` file in your project tree. A throttled stderr warning fires until you add one or set `AGENT_GATE_NO_CONFIG_WARNING=1`.

```ts
// .agent-gate.config.ts
import { defineConfig, forbidCommandPattern } from '@hiro-c/agent-gate'

export default defineConfig({
  disabledRules: ['prevent-force-push-main'],
  protectedBranches: ['main', 'release'],
  customRules: [
    forbidCommandPattern({
      id: 'no-drop-table',
      match: /drop\s+table/i,
      reason: 'DROP TABLE is forbidden. Use a migration.',
    }),
  ],
})
```

`.js` and legacy `.agent-gate.json` are also accepted. Full options live on `AgentGatePluginConfig` in the source.
