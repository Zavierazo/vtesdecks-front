export class LibraryType {
  name: string
  icon: string

  constructor(name: string, icon: string) {
    this.name = name
    this.icon = icon
  }
}

export const LIBRARY_TYPE_LIST = [
  new LibraryType('Master', 'master'),
  new LibraryType('Action', 'action'),
  new LibraryType('Action Modifier', 'modifier'),
  new LibraryType('Political Action', 'political'),
  new LibraryType('Equipment', 'equipment'),
  new LibraryType('Retainer', 'retainer'),
  new LibraryType('Ally', 'ally'),
  new LibraryType('Combat', 'combat'),
  new LibraryType('Reaction', 'reaction'),
  new LibraryType('Event', 'event'),
  new LibraryType('Power', 'power'),
  new LibraryType('Conviction', 'conviction'),
]
