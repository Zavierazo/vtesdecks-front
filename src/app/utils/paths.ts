export class Path {
  name: string
  icon: string
  label: string

  constructor(name: string, icon: string, label: string) {
    this.name = name
    this.icon = icon
    this.label = label
  }
}

export const PATH_LIST = [
  new Path('Caine', 'pathcaine', 'vtes.path.caine'),
  new Path('Cathari', 'pathcathari', 'vtes.path.cathari'),
  new Path('Death and the Soul', 'pathdeath', 'vtes.path.death'),
  new Path('Power and the Inner Voice', 'pathpower', 'vtes.path.power'),
]

export function getPathIcon(path: string): string | undefined {
  return PATH_LIST.find((c) => c.name === path)?.icon
}

export function getPathMarkdown(path: string): Path | undefined {
  return PATH_LIST.find((c) => c.name.toLowerCase() === path.toLowerCase())
}
