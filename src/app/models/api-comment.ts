export interface ApiComment {
  id: number
  deckId: string
  created: Date
  modified: Date
  content: string
  fullName: string
  username: string
  profileImage: string
  createdByAdmin: boolean
  createdBySupporter: boolean
  createdByCurrentUser: boolean
}
