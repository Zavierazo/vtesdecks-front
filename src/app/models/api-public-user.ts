export interface ApiPublicUser {
  user: string
  displayName: string
  profileImage: string
  admin: boolean
  roles: string[]
  followers: ApiPublicUser[]
  following: ApiPublicUser[]
}
