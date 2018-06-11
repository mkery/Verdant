import {
  Widget, TabBar, PanelLayout
} from '@phosphor/widgets'

import {
  NotebookPanel
} from '@jupyterlab/notebook';

import '../../style/index.css';

import {
  Model
} from '../model'

import {
  Run, ChangeType
} from '../run'

import {
  SearchBar
} from './searchbar'

const TABS_ID = 'v-VerdantPanel-tabs'


/**
 * A widget which displays notebook-level history information
 */
 export
 class VerdantPanel extends Widget {

   readonly historyModel : Model
   readonly fileTabs : TabBar<Widget>
   readonly searchBar : SearchBar
   readonly runList : RunList
   readonly layout : PanelLayout

   constructor(historyModel : Model) {
     super()
     this.addClass('v-VerdantPanel');
     this.historyModel = historyModel

     this.fileTabs = new TabBar<Widget>({ orientation: 'vertical' });
     this.fileTabs.id = TABS_ID

     this.searchBar = new SearchBar()

     this.runList = new RunList(this.historyModel)

     let layout = new PanelLayout()
     layout.addWidget(this.fileTabs)
     layout.addWidget(this.searchBar)
     layout.addWidget(this.runList)

     let header = document.createElement('header')
     header.textContent = 'history of notebook'
     this.fileTabs.node.insertBefore(header, this.fileTabs.contentNode)


     this.layout = layout;
   }


   onNotebookSwitch(widg : NotebookPanel)
   {
     this.fileTabs.clearTabs()
     this.fileTabs.addTab(widg.title)
   }

 }



const RUNLIST_CLASS = 'v-VerdantPanel-runList'
const RUNLIST_UL = 'v-VerdantPanel-runList-ul'
const DATEHEADER_CLASS = 'v-VerdantPanel-runList-header'
const RUN_LABEL = 'v-VerdantPanel-runList-runDateTotal'
const DATE_LABEL = 'v-VerdantPanel-runList-dateLabel'
const DATEHEADER_CARET = 'v-VerdantPanel-runList-caret'

const RUN_ITEM_CLASS = 'v-VerdantPanel-runItem'
const RUN_ITEM_CARET = 'v-VerdantPanel-runItem-caret'
const RUN_ITEM_NUMBER = 'v-VerdantPanel-runItem-number'
const RUN_ITEM_TIME = 'v-VerdantPanel-runItem-time'

const RUN_CELL_MAP = 'v-VerdantPanel-runCellMap'
const RUN_CELL_MAP_CELL = 'v-VerdantPanel-runCellMap-cell'
const RUN_CELL_MAP_CHANGED = 'v-VerdantPanel-runCellMap-cell-changed'
const RUN_CELL_MAP_REMOVED = 'v-VerdantPanel-runCellMap-cell-removed'
const RUN_CELL_MAP_ADDED = 'v-VerdantPanel-runCellMap-cell-added'


export class RunList extends Widget {

  readonly historyModel : Model

  constructor(historyModel : Model)
  {
    super()
    this.historyModel = historyModel
    this.addClass(RUNLIST_CLASS)


    var runDataList  = this.historyModel.runs

    runDataList.forEach( (runData) =>
    {

      let dateHeader = document.createElement('div')
      dateHeader.classList.add(DATEHEADER_CLASS)

      let runs = document.createElement('div')
      runs.textContent = 'runs'
      runs.classList.add(RUN_LABEL)

      let date = document.createElement('div')
      date.textContent = this.formatDate(runData.date)
      date.classList.add(DATE_LABEL)

      let caret = document.createElement('div')
      caret.classList.add(DATEHEADER_CARET)

      let runItemList = document.createElement('ul')
      runItemList.classList.add(RUNLIST_UL)
      for(var i = runData.runs.length - 1; i > -1; i--)
      {
        let runItemData = runData.runs[i]
        let runItem = new RunItem(runItemData)
        runItemList.appendChild(runItem.node)
      }

      dateHeader.appendChild(runs)
      dateHeader.appendChild(date)
      dateHeader.appendChild(caret)
      this.node.appendChild(dateHeader)
      this.node.appendChild(runItemList)
    })
  }


  formatDate(timestamp : number) : string
  {
    var monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
    ]

    var today = new Date()
    var yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    var date = new Date(timestamp)

    var dateDesc = ""

    if(this.sameDay(today, date))
      dateDesc = "today "
    else if(this.sameDay(yesterday, date))
      dateDesc = "yesterday "

    dateDesc += monthNames[date.getMonth()] + " " + date.getDate() + " " + date.getFullYear()
    return dateDesc
  }


  sameDay( d1 : Date, d2 : Date )
  {
    return d1.getUTCFullYear() == d2.getUTCFullYear() &&
           d1.getUTCMonth() == d2.getUTCMonth() &&
           d1.getUTCDate() == d2.getUTCDate();
  }

}



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

    this.node.appendChild(caret)
    this.node.appendChild(number)
    this.node.appendChild(time)
    this.node.appendChild(dotMap)
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
}
