import {
  Widget
} from '@phosphor/widgets'

import '../../style/index.css';

import {
  Model
} from '../model'

import {
  Run
} from '../run'

import {
  RunItem
} from './run-item'



const RUNLIST_CLASS = 'v-VerdantPanel-runList'
const RUNLIST_UL = 'v-VerdantPanel-runList-ul'
const DATEHEADER_CLASS = 'v-VerdantPanel-runList-header'
const RUN_LABEL = 'v-VerdantPanel-runList-runDateTotal'
const DATE_LABEL = 'v-VerdantPanel-runList-dateLabel'
const DATEHEADER_CARET = 'v-VerdantPanel-runList-caret'
const RUN_ITEM_ACTIVE = 'jp-mod-active'


export class RunList extends Widget {

  readonly historyModel : Model
  selectedRun : RunItem

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

      let runItemList = this.buildRunItemList(runData.runs)

      dateHeader.appendChild(runs)
      dateHeader.appendChild(date)
      dateHeader.appendChild(caret)
      this.node.appendChild(dateHeader)
      this.node.appendChild(runItemList)
    })
  }


  private formatDate(timestamp : number) : string
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


  private sameDay( d1 : Date, d2 : Date )
  {
    return d1.getUTCFullYear() == d2.getUTCFullYear() &&
           d1.getUTCMonth() == d2.getUTCMonth() &&
           d1.getUTCDate() == d2.getUTCDate();
  }


  private buildRunItemList(runList: Run[]) : HTMLElement
  {
    let runItemList = document.createElement('ul')
    runItemList.classList.add(RUNLIST_UL)
    for(var i = runList.length - 1; i > -1; i--)
    {
      let runItemData = runList[i]
      let runItem = new RunItem(runItemData)
      runItemList.appendChild(runItem.node)

      runItem.node.addEventListener("click", this.onClick.bind(this, runItem))
    }
    return runItemList
  }


  /**
  * Handle the `'click'` event for the widget.
  */
 private onClick(runItem : RunItem, event: Event) {
   if(this.selectedRun)
      this.selectedRun.node.classList.remove(RUN_ITEM_ACTIVE)

   runItem.node.classList.add(RUN_ITEM_ACTIVE)
   this.selectedRun = runItem

   let target = event.target as HTMLElement;
   if(target.classList.contains('v-VerdantPanel-runItem-caret'))
     runItem.caretClicked()
   else
    console.log("Open old version of notebook")
 }

}
