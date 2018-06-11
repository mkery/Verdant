

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

    var cells = [{'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_CHANGED}, {'node': '1.4', 'change_type': ChangeType.CELL_ADDED}, {'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_REMOVED}]
    var run1 = new Run(Date.now(), cells, 1)
    var runs = []
    runs.push(run1)
    var cells = [{'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_CHANGED}, {'node': '1.4', 'change_type': ChangeType.CELL_SAME}, {'node': '1.4', 'change_type': ChangeType.CELL_CHANGED}, {'node': '1.4', 'change_type': ChangeType.CELL_SAME}]
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
