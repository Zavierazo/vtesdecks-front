export class Discipline {
  name: string
  label: string
  icon: string
  abbrev: string
  hasSuperior: boolean

  constructor(
    name: string,
    label: string,
    abbrev: string,
    icon: string,
    hasSuperior: boolean,
  ) {
    this.name = name
    this.label = label
    this.abbrev = abbrev
    this.icon = icon
    this.hasSuperior = hasSuperior
  }

  get iconSuperior(): string {
    return this.icon + 'sup'
  }
}

export const DISCIPLINE_LIST = [
  new Discipline('Abombwe', 'vtes.discipline.abombwe', 'abo', 'abombwe', true),
  new Discipline(
    'Animalism',
    'vtes.discipline.animalism',
    'ani',
    'animalism',
    true,
  ),
  new Discipline('Auspex', 'vtes.discipline.auspex', 'aus', 'auspex', true),
  new Discipline(
    'Celerity',
    'vtes.discipline.celerity',
    'cel',
    'celerity',
    true,
  ),
  new Discipline(
    'Chimerstry',
    'vtes.discipline.chimerstry',
    'chi',
    'chimerstry',
    true,
  ),
  new Discipline(
    'Daimoinon',
    'vtes.discipline.daimoinon',
    'dai',
    'daimoinon',
    true,
  ),
  new Discipline(
    'Dementation',
    'vtes.discipline.dementation',
    'dem',
    'dementation',
    true,
  ),
  new Discipline(
    'Dominate',
    'vtes.discipline.dominate',
    'dom',
    'dominate',
    true,
  ),
  new Discipline(
    'Fortitude',
    'vtes.discipline.fortitude',
    'for',
    'fortitude',
    true,
  ),
  new Discipline(
    'Maleficia',
    'vtes.discipline.maleficia',
    'mal',
    'maleficia',
    true,
  ),
  new Discipline(
    'Melpominee',
    'vtes.discipline.melpominee',
    'mel',
    'melpominee',
    true,
  ),
  new Discipline(
    'Mytherceria',
    'vtes.discipline.mytherceria',
    'myt',
    'mytherceria',
    true,
  ),
  new Discipline(
    'Necromancy',
    'vtes.discipline.necromancy',
    'nec',
    'necromancy',
    true,
  ),
  new Discipline('Obeah', 'vtes.discipline.obeah', 'obe', 'obeah', true),
  new Discipline(
    'Obfuscate',
    'vtes.discipline.obfuscate',
    'obf',
    'obfuscate',
    true,
  ),
  new Discipline(
    'Oblivion',
    'vtes.discipline.oblivion',
    'obl',
    'oblivion',
    true,
  ),
  new Discipline(
    'Obtenebration',
    'vtes.discipline.obtenebration',
    'obt',
    'obtenebration',
    true,
  ),
  new Discipline('Potence', 'vtes.discipline.potence', 'pot', 'potence', true),
  new Discipline(
    'Presence',
    'vtes.discipline.presence',
    'pre',
    'presence',
    true,
  ),
  new Discipline('Protean', 'vtes.discipline.protean', 'pro', 'protean', true),
  new Discipline('Quietus', 'vtes.discipline.quietus', 'qui', 'quietus', true),
  new Discipline(
    'Sanguinus',
    'vtes.discipline.sanguinus',
    'san',
    'sanguinus',
    true,
  ),
  new Discipline(
    'Serpentis',
    'vtes.discipline.serpentis',
    'ser',
    'serpentis',
    true,
  ),
  new Discipline(
    'Spiritus',
    'vtes.discipline.spiritus',
    'spi',
    'spiritus',
    true,
  ),
  new Discipline('Striga', 'vtes.discipline.striga', 'str', 'striga', true),
  new Discipline(
    'Temporis',
    'vtes.discipline.temporis',
    'tem',
    'temporis',
    true,
  ),
  new Discipline(
    'Thanatosis',
    'vtes.discipline.thanatosis',
    'thn',
    'thanatosis',
    true,
  ),
  new Discipline(
    'Blood Sorcery',
    'vtes.discipline.bloodsorcery',
    'tha',
    'bloodsorcery',
    true,
  ),
  new Discipline('Valeren', 'vtes.discipline.valeren', 'val', 'valeren', true),
  new Discipline(
    'Vicissitude',
    'vtes.discipline.vicissitude',
    'vic',
    'vicissitude',
    true,
  ),
  new Discipline(
    'Visceratika',
    'vtes.discipline.visceratika',
    'vis',
    'visceratika',
    true,
  ),
  new Discipline('Defense', 'vtes.discipline.defense', 'def', 'defense', false),
  new Discipline(
    'Innocence',
    'vtes.discipline.innocence',
    'inn',
    'innocence',
    false,
  ),
  new Discipline(
    'Judgment',
    'vtes.discipline.judgment',
    'jud',
    'judgment',
    false,
  ),
  new Discipline(
    'Martyrdom',
    'vtes.discipline.martyrdom',
    'mar',
    'martyrdom',
    false,
  ),
  new Discipline(
    'Redemption',
    'vtes.discipline.redemption',
    'red',
    'redemption',
    false,
  ),
  new Discipline(
    'Vengeance',
    'vtes.discipline.vengeance',
    'ven',
    'vengeance',
    false,
  ),
  new Discipline('Vision', 'vtes.discipline.vision', 'viz', 'vision', false),
]

export function getDisciplineIcon(
  discipline: string,
  superior: boolean,
): string | undefined {
  if (superior) {
    return DISCIPLINE_LIST.find((d) => d.name === discipline)?.iconSuperior
  } else {
    return DISCIPLINE_LIST.find((d) => d.name === discipline)?.icon
  }
}
