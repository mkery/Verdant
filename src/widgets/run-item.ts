import {
  Run, ChangeType
} from '../run'

import {
  Widget
} from '@phosphor/widgets'

import '../../style/index.css';


const RUN_ITEM_CLASS = 'v-VerdantPanel-runItem'
const RUN_ITEM_CARET = 'v-VerdantPanel-runItem-caret'
const RUN_ITEM_NUMBER = 'v-VerdantPanel-runItem-number'
const RUN_ITEM_TIME = 'v-VerdantPanel-runItem-time'

const RUN_CELL_MAP = 'v-VerdantPanel-runCellMap'
const RUN_CELL_MAP_CELL = 'v-VerdantPanel-runCellMap-cell'
const RUN_CELL_MAP_CHANGED = 'v-VerdantPanel-runCellMap-cell-changed'
const RUN_CELL_MAP_REMOVED = 'v-VerdantPanel-runCellMap-cell-removed'
const RUN_CELL_MAP_ADDED = 'v-VerdantPanel-runCellMap-cell-added'


export class RunItem extends Widget {

  readonly run : Run

  constructor(run : Run)
  {
    super()
    this.run = run
    this.addClass(RUN_ITEM_CLASS)

    let caret = document.createElement('div')
    caret.classList.add(RUN_ITEM_CARET)

    let number = document.createElement('div')
    number.textContent = '#'+run.id
    number.classList.add(RUN_ITEM_NUMBER)

    let time = document.createElement('div')
    time.textContent = this.formatTime()
    time.classList.add(RUN_ITEM_TIME)

    let dotMap = this.buildDotMap()

    this.node.appendChild(number)
    this.node.appendChild(time)
    this.node.appendChild(dotMap)
    this.node.appendChild(caret)
  }


  buildDotMap() : HTMLElement
  {
    let dotMap = document.createElement('div')
    dotMap.classList.add(RUN_CELL_MAP)
    this.run.cells.forEach((cell) => {
      let div = document.createElement('div')
      div.classList.add(RUN_CELL_MAP_CELL)
      switch(cell.change_type)
      {
        case ChangeType.CELL_CHANGED:
          div.classList.add(RUN_CELL_MAP_CHANGED)
          break
        case ChangeType.CELL_REMOVED:
          div.classList.add(RUN_CELL_MAP_REMOVED)
          break
        case ChangeType.CELL_ADDED:
          div.classList.add(RUN_CELL_MAP_ADDED)
          break
        default:
          break
      }
      dotMap.appendChild(div)
    })
    return dotMap
  }


  formatTime() : string
  {
    var date = new Date(this.run.timestamp)
    var hours = date.getHours()
    var minutes = date.getMinutes()
    var ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return hours + ":" + (minutes < 10 ? '0'+minutes : minutes) + ampm
  }


  caretClicked()
  {
    console.log("Caret was clicked!")
  }

}
