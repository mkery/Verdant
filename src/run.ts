

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


  public addNewRun(timestamp: number, cells: CellRunData[])
  {
    var today = this.dateNow()
    var latestDate = this._runList[Math.max(this._runList.length - 1, 0)]
    if(!latestDate || latestDate.date !== today)
    {
      var todaysRuns = {'date': today, 'runs' : <Run[]>[]}
      this._runList.push(todaysRuns)
    }
    else
      var todaysRuns = latestDate

    var run = new Run(timestamp, cells, this.countNewRun())
    todaysRuns.runs.push(run)

    return run
  }


  private dateNow() : number
  {
    var d = new Date()
    d.setHours(12,0,0) // set to default time since we only want the day
    return d.getTime()
  }


  private countNewRun()
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

    var cells = [{'node': '1.4', 'changeType': ChangeType.CELL_SAME}, {'node': '1.4', 'changeType': ChangeType.CELL_SAME}, {'node': '1.4', 'changeType': ChangeType.CELL_CHANGED, 'run': true}, {'node': '1.4', 'changeType': ChangeType.CELL_ADDED}, {'node': '1.4', 'changeType': ChangeType.CELL_SAME}, {'node': '1.4', 'changeType': ChangeType.CELL_SAME}, {'node': '1.4', 'changeType': ChangeType.CELL_REMOVED}]
    var run1 = new Run(Date.now(), cells, 1)
    var runs = []
    runs.push(run1)
    var cells = [{'node': '1.4', 'changeType': ChangeType.CELL_SAME, 'run': true}, {'node': '1.4', 'changeType': ChangeType.CELL_SAME}, {'node': '1.4', 'changeType': ChangeType.CELL_CHANGED}, {'node': '1.4', 'changeType': ChangeType.CELL_SAME}, {'node': '1.4', 'changeType': ChangeType.CELL_CHANGED}, {'node': '1.4', 'changeType': ChangeType.CELL_SAME}]
    var run2 = new Run(Date.now(), cells, 2)
    runs.push(run2)

    this._runList.push({'date': yesterday.getTime(), 'runs': runs})
  }

}


export
namespace ChangeType
{
  export const CELL_CHANGED = 2
  export const CELL_REMOVED = -1
  export const CELL_ADDED = 1
  export const CELL_SAME = 0
}


export
interface CellRunData
{
  node : string
  changeType : number
  run?: boolean
}



export
class Run
{
  readonly timestamp : number
  readonly id : number
  readonly cells : CellRunData[]

  constructor( timestamp : number, cells : CellRunData[], id : number )
  {
    this.timestamp = timestamp
    this.cells = cells
    this.id = id
  }
}
