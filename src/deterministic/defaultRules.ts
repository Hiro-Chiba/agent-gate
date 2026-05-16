import { DeterministicRule } from './types'
import { preventRmRfRoot } from './rules/preventRmRfRoot'

export const defaultDeterministicRules: DeterministicRule[] = [
  preventRmRfRoot,
]
