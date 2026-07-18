export type FeatureFlagType = 'BOOLEAN' | 'STRING' | 'LIST'

export type FeatureFlagValue = boolean | string | string[]

export interface ApiFeatureFlag {
  key: string
  type: FeatureFlagType
  value: FeatureFlagValue
  description?: string
}
