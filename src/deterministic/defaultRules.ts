import { DeterministicRule } from './types'
import { preventRmRfRoot } from './rules/preventRmRfRoot'
import { preventSecretFileWrite } from './rules/preventSecretFileWrite'

export const defaultDeterministicRules: DeterministicRule[] = [
  preventRmRfRoot,
  preventSecretFileWrite,
]
