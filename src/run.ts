

const CELL_CHANGED = 2
const CELL_REMOVED = -1
const CELL_ADDED = 1
const CELL_SAME = 0

export
class RunRecord
{
  private _runList : { 'date': number, 'runs' : Run[] }[]
  private _runCounter : number

  constructor(runCount : number = 0)
  {
    this._runCounter = runCount
    this._runList = []
    this.testBuild()
  }

  get runs()
  {
    return this._runList
  }

  countNewRun()
  {
    this._runCounter ++
    return this._runCounter
  }

  testBuild()
  {
    var today = new Date()
    var yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    var y2 = new Date()
    y2.setDate(yesterday.getDate() - 1)

    var cells = [{'node': '1.4', 'change_type': CELL_SAME}, {'node': '1.4', 'change_type': CELL_SAME}, {'node': '1.4', 'change_type': CELL_CHANGED}, {'node': '1.4', 'change_type': CELL_ADDED}, {'node': '1.4', 'change_type': CELL_SAME}, {'node': '1.4', 'change_type': CELL_SAME}, {'node': '1.4', 'change_type': CELL_REMOVED}]
    var run1 = new Run(Date.now(), cells, 1)
    var runs = []
    runs.push(run1)

    this._runList.push({'date': yesterday.getTime(), 'runs': runs})
  }

}

export
class Run
{
  readonly timestamp : number
  readonly id : number
  readonly cells : {'node': string, 'change_type' : number}[]

  constructor( timestamp : number, cells : {'node': string, 'change_type' : number}[], id : number )
  {
    this.timestamp = timestamp
    this.cells = cells
    this.id = id
  }
}
