export interface ApiAdminUser {
  user: string
  displayName: string
  profileImage: string
  email: string
  patreonId?: string | null
  veknId?: string | null
  validated: boolean
  admin: boolean
  roles: string[]
  availableRoles: string[]
}

export interface ApiAdminUserAccess {
  admin: boolean
  roles: string[]
}
