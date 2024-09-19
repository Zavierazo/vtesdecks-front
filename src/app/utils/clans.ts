export class Clan {
  name: string
  icon: string
  label: string

  constructor(name: string, icon: string, label: string) {
    this.name = name
    this.icon = icon
    this.label = label
  }
}

export const CLAN_LIST = [
  new Clan('Abomination', 'abo', 'vtes.clan.abo'),
  new Clan('Ahrimane', 'ahrimanes', 'vtes.clan.ahrimanes'),
  new Clan('Akunanse', 'akunanse', 'vtes.clan.akunanse'),
  new Clan('Assamite', 'assamite', 'vtes.clan.assamite'),
  new Clan('Baali', 'baali', 'vtes.clan.baali'),
  new Clan('Blood Brother', 'bloodbrothers', 'vtes.clan.bloodbrothers'),
  new Clan('Brujah', 'brujah', 'vtes.clan.brujah'),
  new Clan('Brujah antitribu', 'brujahanti', 'vtes.clan.brujahanti'),
  new Clan('Caitiff', 'caitiff', 'vtes.clan.caitiff'),
  new Clan('Daughter of Cacophony', 'daughters', 'vtes.clan.daughters'),
  new Clan('Follower of Set', 'fos', 'vtes.clan.fos'),
  new Clan('Gangrel', 'gangrel', 'vtes.clan.gangrel'),
  new Clan('Gangrel antitribu', 'gangrelanti', 'vtes.clan.gangrelanti'),
  new Clan('Gargoyle', 'gargoyle', 'vtes.clan.gargoyle'),
  new Clan('Giovanni', 'giovanni', 'vtes.clan.giovanni'),
  new Clan('Guruhi', 'guruhi', 'vtes.clan.guruhi'),
  new Clan('Harbinger of Skulls', 'harbingers', 'vtes.clan.harbingers'),
  new Clan('Ishtarri', 'ishtarri', 'vtes.clan.ishtarri'),
  new Clan('Kiasyd', 'kiasyd', 'vtes.clan.kiasyd'),
  new Clan('Lasombra', 'lasombra', 'vtes.clan.lasombra'),
  new Clan('Malkavian', 'malkavian', 'vtes.clan.malkavian'),
  new Clan('Malkavian antitribu', 'malkaviananti', 'vtes.clan.malkaviananti'),
  new Clan('Nagaraja', 'nagaraja', 'vtes.clan.nagaraja'),
  new Clan('Nosferatu', 'nosferatu', 'vtes.clan.nosferatu'),
  new Clan('Nosferatu antitribu', 'nosferatuanti', 'vtes.clan.nosferatuanti'),
  new Clan('Osebo', 'osebo', 'vtes.clan.osebo'),
  new Clan('Pander', 'pander', 'vtes.clan.pander'),
  new Clan('Ravnos', 'ravnos', 'vtes.clan.ravnos'),
  new Clan('Salubri', 'salubri', 'vtes.clan.salubri'),
  new Clan('Salubri antitribu', 'salubrianti', 'vtes.clan.salubrianti'),
  new Clan('Samedi', 'samedi', 'vtes.clan.samedi'),
  new Clan('Toreador', 'toreador', 'vtes.clan.toreador'),
  new Clan('Toreador antitribu', 'toreadoranti', 'vtes.clan.toreadoranti'),
  new Clan('Tremere', 'tremere', 'vtes.clan.tremere'),
  new Clan('Tremere antitribu', 'tremereanti', 'vtes.clan.tremereanti'),
  new Clan('True Brujah', 'truebrujah', 'vtes.clan.truebrujah'),
  new Clan('Tzimisce', 'tzimisce', 'vtes.clan.tzimisce'),
  new Clan('Ventrue', 'ventrue', 'vtes.clan.ventrue'),
  new Clan('Ventrue antitribu', 'ventrueanti', 'vtes.clan.ventrueanti'),
  new Clan('Visionary', 'visionary', 'vtes.clan.visionary'),
  new Clan('Avenger', 'avenger', 'vtes.clan.avenger'),
  new Clan('Defender', 'defender', 'vtes.clan.defender'),
  new Clan('Innocent', 'innocent', 'vtes.clan.innocent'),
  new Clan('Judge', 'judge', 'vtes.clan.judge'),
  new Clan('Martyr', 'martyr', 'vtes.clan.martyr'),
  new Clan('Redeemer', 'redeemer', 'vtes.clan.redeemer'),
]

export function getClanIcon(clan: string): string | undefined {
  return CLAN_LIST.find((c) => c.name === clan)?.icon
}
