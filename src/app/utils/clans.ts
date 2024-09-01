export class Clan {
  name: string;
  icon: string;

  constructor(name: string, icon: string) {
    this.name = name;
    this.icon = icon;
  }
}

export const CLAN_LIST = [
  new Clan('Abomination', 'abo'),
  new Clan('Ahrimane', 'ahrimanes'),
  new Clan('Akunanse', 'akunanse'),
  new Clan('Assamite', 'assamite'),
  new Clan('Baali', 'baali'),
  new Clan('Blood Brother', 'bloodbrothers'),
  new Clan('Brujah', 'brujah'),
  new Clan('Brujah antitribu', 'brujahanti'),
  new Clan('Caitiff', 'caitiff'),
  new Clan('Daughter of Cacophony', 'daughters'),
  new Clan('Follower of Set', 'fos'),
  new Clan('Gangrel', 'gangrel'),
  new Clan('Gangrel antitribu', 'gangrelanti'),
  new Clan('Gargoyle', 'gargoyle'),
  new Clan('Giovanni', 'giovanni'),
  new Clan('Guruhi', 'guruhi'),
  new Clan('Harbinger of Skulls', 'harbingers'),
  new Clan('Ishtarri', 'ishtarri'),
  new Clan('Kiasyd', 'kiasyd'),
  new Clan('Lasombra', 'lasombra'),
  new Clan('Malkavian', 'malkavian'),
  new Clan('Malkavian antitribu', 'malkaviananti'),
  new Clan('Nagaraja', 'nagaraja'),
  new Clan('Nosferatu', 'nosferatu'),
  new Clan('Nosferatu antitribu', 'nosferatuanti'),
  new Clan('Osebo', 'osebo'),
  new Clan('Pander', 'pander'),
  new Clan('Ravnos', 'ravnos'),
  new Clan('Salubri', 'salubri'),
  new Clan('Salubri antitribu', 'salubrianti'),
  new Clan('Samedi', 'samedi'),
  new Clan('Toreador', 'toreador'),
  new Clan('Toreador antitribu', 'toreadoranti'),
  new Clan('Tremere', 'tremere'),
  new Clan('Tremere antitribu', 'tremereanti'),
  new Clan('True Brujah', 'truebrujah'),
  new Clan('Tzimisce', 'tzimisce'),
  new Clan('Ventrue', 'ventrue'),
  new Clan('Ventrue antitribu', 'ventrueanti'),
  new Clan('Visionary', 'visionary'),
  new Clan('Avenger', 'avenger'),
  new Clan('Defender', 'defender'),
  new Clan('Innocent', 'innocent'),
  new Clan('Judge', 'judge'),
  new Clan('Martyr', 'martyr'),
  new Clan('Redeemer', 'redeemer'),
];

export function getClanIcon(clan: string): string | undefined {
  return CLAN_LIST.find((c) => c.name === clan)?.icon;
}
