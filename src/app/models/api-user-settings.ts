import { CardPrintingPreference } from './card-printing-preference'

export interface ApiUserSettings {
  profileImage?: string
  displayName: string
  password?: string
  newPassword?: string
  cardPrintingPreference?: CardPrintingPreference
}
