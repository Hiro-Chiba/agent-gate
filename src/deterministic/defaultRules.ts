import { DeterministicRule } from './types'
import { preventRmRfRoot } from './rules/preventRmRfRoot'
import { preventSecretFileWrite } from './rules/preventSecretFileWrite'
import { preventForcePushMain } from './rules/preventForcePushMain'

export const defaultDeterministicRules: DeterministicRule[] = [
  preventRmRfRoot,
  preventSecretFileWrite,
  preventForcePushMain,
]
