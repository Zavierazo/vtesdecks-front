export class Discipline {
  name: string
  icon: string
  abbrev: string
  hasSuperior: boolean

  constructor(
    name: string,
    abbrev: string,
    icon: string,
    hasSuperior: boolean,
  ) {
    this.name = name
    this.abbrev = abbrev
    this.icon = icon
    this.hasSuperior = hasSuperior
  }

  get iconSuperior(): string {
    return this.icon + 'sup'
  }
}

export const DISCIPLINE_LIST = [
  new Discipline('Abombwe', 'abo', 'abombwe', true),
  new Discipline('Animalism', 'ani', 'animalism', true),
  new Discipline('Auspex', 'aus', 'auspex', true),
  new Discipline('Celerity', 'cel', 'celerity', true),
  new Discipline('Chimerstry', 'chi', 'chimerstry', true),
  new Discipline('Daimoinon', 'dai', 'daimoinon', true),
  new Discipline('Dementation', 'dem', 'dementation', true),
  new Discipline('Dominate', 'dom', 'dominate', true),
  new Discipline('Fortitude', 'for', 'fortitude', true),
  new Discipline('Maleficia', 'mal', 'maleficia', true),
  new Discipline('Melpominee', 'mel', 'melpominee', true),
  new Discipline('Mytherceria', 'myt', 'mytherceria', true),
  new Discipline('Necromancy', 'nec', 'necromancy', true),
  new Discipline('Obeah', 'obe', 'obeah', true),
  new Discipline('Obfuscate', 'obf', 'obfuscate', true),
  new Discipline('Obtenebration', 'obt', 'obtenebration', true),
  new Discipline('Potence', 'pot', 'potence', true),
  new Discipline('Presence', 'pre', 'presence', true),
  new Discipline('Protean', 'pro', 'protean', true),
  new Discipline('Quietus', 'qui', 'quietus', true),
  new Discipline('Sanguinus', 'san', 'sanguinus', true),
  new Discipline('Serpentis', 'ser', 'serpentis', true),
  new Discipline('Spiritus', 'spi', 'spiritus', true),
  new Discipline('Striga', 'str', 'striga', true),
  new Discipline('Temporis', 'tem', 'temporis', true),
  new Discipline('Thanatosis', 'thn', 'thanatosis', true),
  new Discipline('Blood Sorcery', 'tha', 'bloodsorcery', true),
  new Discipline('Valeren', 'val', 'valeren', true),
  new Discipline('Vicissitude', 'vic', 'vicissitude', true),
  new Discipline('Visceratika', 'vis', 'visceratika', true),
  new Discipline('Defense', 'def', 'defense', false),
  new Discipline('Innocence', 'inn', 'innocence', false),
  new Discipline('Judgment', 'jud', 'judgment', false),
  new Discipline('Martyrdom', 'mar', 'martyrdom', false),
  new Discipline('Redemption', 'red', 'redemption', false),
  new Discipline('Vengeance', 'ven', 'vengeance', false),
  new Discipline('Vision', 'viz', 'vision', false),
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
