





export
class Model
{

  constructor(startCount: number = 0)
  {
    this._nodeyCounter = startCount
  }


  dispenseNodeyID(): number{
    var id = this._nodeyCounter
    this._nodeyCounter ++
    return id
  }
  private _nodeyCounter = 0
}
