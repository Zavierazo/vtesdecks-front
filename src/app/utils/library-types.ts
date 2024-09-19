export class LibraryType {
  name: string
  icon: string
  label: string

  constructor(name: string, icon: string, label: string) {
    this.name = name
    this.icon = icon
    this.label = label
  }
}

export const LIBRARY_TYPE_LIST = [
  new LibraryType('Master', 'master', 'vtes.type.master'),
  new LibraryType('Action', 'action', 'vtes.type.action'),
  new LibraryType('Action Modifier', 'modifier', 'vtes.type.modifier'),
  new LibraryType('Political Action', 'political', 'vtes.type.political'),
  new LibraryType('Equipment', 'equipment', 'vtes.type.equipment'),
  new LibraryType('Retainer', 'retainer', 'vtes.type.retainer'),
  new LibraryType('Ally', 'ally', 'vtes.type.ally'),
  new LibraryType('Combat', 'combat', 'vtes.type.combat'),
  new LibraryType('Reaction', 'reaction', 'vtes.type.reaction'),
  new LibraryType('Event', 'event', 'vtes.type.event'),
  new LibraryType('Power', 'power', 'vtes.type.power'),
  new LibraryType('Conviction', 'conviction', 'vtes.type.conviction'),
]
