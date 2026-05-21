import { describe, it, expect } from 'vitest'
import {
  DefaultNoConfigWarner,
  WarningStamp,
} from '../../src/hooks/processHookData'

class InMemoryWarningStamp implements WarningStamp {
  private store = new Map<string, number>()
  getLastTime(key: string): number {
    return this.store.get(key) ?? 0
  }
  setLastTime(key: string, time: number): void {
    this.store.set(key, time)
  }
}

describe('DefaultNoConfigWarner', () => {
  it('writes a message to the injected stderr sink on first warn', () => {
    const stderr: string[] = []
    const warner = new DefaultNoConfigWarner({
      stamp: new InMemoryWarningStamp(),
      now: () => 1000,
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => false,
    })

    warner.warn('/proj')

    expect(stderr).toHaveLength(1)
    expect(stderr[0]).toContain('/proj')
    expect(stderr[0]).toContain('.agent-gate.config.*')
    expect(stderr[0]).toContain('AGENT_GATE_NO_CONFIG_WARNING')
  })

  it('suppresses subsequent warns within the throttle window', () => {
    const stderr: string[] = []
    const warner = new DefaultNoConfigWarner({
      stamp: new InMemoryWarningStamp(),
      throttleMs: 60_000,
      now: () => 1000,
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => false,
    })

    warner.warn('/proj')
    warner.warn('/proj')

    expect(stderr).toHaveLength(1)
  })

  it('warns again once the throttle window expires', () => {
    const stderr: string[] = []
    let nowVal = 1000
    const warner = new DefaultNoConfigWarner({
      stamp: new InMemoryWarningStamp(),
      throttleMs: 60_000,
      now: () => nowVal,
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => false,
    })

    warner.warn('/proj')
    nowVal = 1000 + 60_001
    warner.warn('/proj')

    expect(stderr).toHaveLength(2)
  })

  it('tracks throttle state per cwd', () => {
    const stderr: string[] = []
    const warner = new DefaultNoConfigWarner({
      stamp: new InMemoryWarningStamp(),
      throttleMs: 60_000,
      now: () => 1000,
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => false,
    })

    warner.warn('/a')
    warner.warn('/b')
    warner.warn('/a') // within throttle

    expect(stderr).toHaveLength(2)
    expect(stderr[0]).toContain('/a')
    expect(stderr[1]).toContain('/b')
  })

  it('emits nothing when isSilenced returns true', () => {
    const stderr: string[] = []
    const warner = new DefaultNoConfigWarner({
      stamp: new InMemoryWarningStamp(),
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => true,
    })

    warner.warn('/proj')

    expect(stderr).toHaveLength(0)
  })

  it('default isSilenced honors AGENT_GATE_NO_CONFIG_WARNING=1', () => {
    const stderr: string[] = []
    const original = process.env.AGENT_GATE_NO_CONFIG_WARNING
    process.env.AGENT_GATE_NO_CONFIG_WARNING = '1'
    try {
      const warner = new DefaultNoConfigWarner({
        stamp: new InMemoryWarningStamp(),
        writeStderr: (m) => stderr.push(m),
      })
      warner.warn('/proj')
      expect(stderr).toHaveLength(0)
    } finally {
      if (original === undefined) {
        delete process.env.AGENT_GATE_NO_CONFIG_WARNING
      } else {
        process.env.AGENT_GATE_NO_CONFIG_WARNING = original
      }
    }
  })

  it('default isSilenced honors AGENT_GATE_NO_CONFIG_WARNING=true', () => {
    const stderr: string[] = []
    const original = process.env.AGENT_GATE_NO_CONFIG_WARNING
    process.env.AGENT_GATE_NO_CONFIG_WARNING = 'true'
    try {
      const warner = new DefaultNoConfigWarner({
        stamp: new InMemoryWarningStamp(),
        writeStderr: (m) => stderr.push(m),
      })
      warner.warn('/proj')
      expect(stderr).toHaveLength(0)
    } finally {
      if (original === undefined) {
        delete process.env.AGENT_GATE_NO_CONFIG_WARNING
      } else {
        process.env.AGENT_GATE_NO_CONFIG_WARNING = original
      }
    }
  })

  it('warns again when the clock jumps backward (now < last)', () => {
    const stderr: string[] = []
    const stamp = new InMemoryWarningStamp()
    let nowVal = 10_000_000
    const warner = new DefaultNoConfigWarner({
      stamp,
      throttleMs: 60_000,
      now: () => nowVal,
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => false,
    })

    warner.warn('/proj')
    // Simulate NTP correction: clock jumps backward past the prior stamp.
    nowVal = 100
    warner.warn('/proj')

    expect(stderr).toHaveLength(2)
  })

  it('reads default throttleMs from AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC', () => {
    const original = process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC
    process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC = '5'
    try {
      const stderr: string[] = []
      let nowVal = 1000
      const warner = new DefaultNoConfigWarner({
        stamp: new InMemoryWarningStamp(),
        now: () => nowVal,
        writeStderr: (m) => stderr.push(m),
        isSilenced: () => false,
      })
      warner.warn('/proj')
      // 5 sec = 5000 ms; still inside the window.
      nowVal = 1000 + 4999
      warner.warn('/proj')
      expect(stderr).toHaveLength(1)
      // Past the env-configured window.
      nowVal = 1000 + 5001
      warner.warn('/proj')
      expect(stderr).toHaveLength(2)
    } finally {
      if (original === undefined) {
        delete process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC
      } else {
        process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC = original
      }
    }
  })

  it('falls back to the default throttle when TTL env is invalid', () => {
    const original = process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC
    process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC = 'not-a-number'
    try {
      const stderr: string[] = []
      const warner = new DefaultNoConfigWarner({
        stamp: new InMemoryWarningStamp(),
        now: () => 1000,
        writeStderr: (m) => stderr.push(m),
        isSilenced: () => false,
      })
      warner.warn('/proj')
      warner.warn('/proj')
      expect(stderr).toHaveLength(1)
    } finally {
      if (original === undefined) {
        delete process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC
      } else {
        process.env.AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC = original
      }
    }
  })

  it('swallows stamp setLastTime errors without throwing', () => {
    const stderr: string[] = []
    const exploding: WarningStamp = {
      getLastTime: () => 0,
      setLastTime: () => {
        throw new Error('disk full')
      },
    }
    const warner = new DefaultNoConfigWarner({
      stamp: exploding,
      writeStderr: (m) => stderr.push(m),
      isSilenced: () => false,
    })

    expect(() => warner.warn('/proj')).not.toThrow()
  })
})
