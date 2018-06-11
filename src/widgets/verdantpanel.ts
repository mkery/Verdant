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
  Run
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
const DATEHEADER_CLASS = 'v-VerdantPanel-runList-header'
const RUN_LABEL = 'v-VerdantPanel-runList-runDateTotal'
const DATE_LABEL = 'v-VerdantPanel-runList-dateLabel'
const DATEHEADER_CARET = 'v-VerdantPanel-runList-caret'
const RUN_ITEM_CLASS = 'v-VerdantPanel-runItem'

export class RunList extends Widget {

  readonly historyModel : Model

  constructor(historyModel : Model)
  {
    super()
    this.historyModel = historyModel
    this.addClass(RUNLIST_CLASS)


    let runs = this.historyModel.runs
    console.log("GOT RUNS?", this.historyModel, runs)
    runs.forEach((runData) => {

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

      dateHeader.appendChild(runs)
      dateHeader.appendChild(date)
      dateHeader.appendChild(caret)
      this.node.appendChild(dateHeader)
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

  run : Run

  constructor(run : Run)
  {
    super()
    this.run = run

    this.addClass(RUN_ITEM_CLASS)
  }

}
