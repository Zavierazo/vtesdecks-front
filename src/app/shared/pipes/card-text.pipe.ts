import { Pipe, PipeTransform } from '@angular/core'
import { DISCIPLINE_LIST, LIBRARY_TYPE_LIST } from '@utils'

@Pipe({ name: 'cardText' })
export class CardTextPipe implements PipeTransform {
  transform(text?: string): string {
    if (text === undefined) {
      return ''
    }
    // Replace [Type] with type icons
    LIBRARY_TYPE_LIST.forEach((type) => {
      const typeRegex = new RegExp(`\\[(\\d )?${type.name}\\]`, 'gi')
      const typeIcon = `<i class="vtes vtes-small ${type.icon}"></i>`
      text = text?.replace(typeRegex, typeIcon)
    })

    // Replace [Discipline] with discipline icons
    DISCIPLINE_LIST.forEach((discipline) => {
      // Replace lowercase [discipline] with regular icon
      const disciplineLower = new RegExp(`\\[${discipline.abbrev}\\]`, 'g')
      const disciplineIcon = `<i class="vtes vtes-small ${discipline.icon}"></i>`
      text = text?.replace(disciplineLower, disciplineIcon)

      // Replace uppercase [DISCIPLINE] with superior icon
      const disciplineUpper = new RegExp(`\\[${discipline.abbrev}\\]`, 'gi')
      const disciplineSuperiorIcon = `<i class="vtes vtes-small ${discipline.iconSuperior}"></i>`
      text = text?.replace(disciplineUpper, disciplineSuperiorIcon)
    })
    // Replace {} with italics
    text = text.replace(/{(.*?)}/g, '<em>$1</em>')

    // Replace line breaks with <br>
    text = text.replace(/\n/g, '<br>')

    return text
  }
}
