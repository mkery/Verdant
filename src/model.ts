import{
  Nodey, NodeyCode, serialized_Nodey
} from './nodey'



export
class Model
{

  constructor(startCount: number = 0)
  {
    this._nodeyCounter = startCount
  }

  private _nodeyCounter = 0
  private _nodeyStore : Nodey[] = []

  dispenseNodeyID(): number{
    var id = this._nodeyCounter
    this._nodeyCounter ++
    return id
  }


  getCodeNodey(id: number) : NodeyCode { //TODO seperate list for markdown and output
    return <NodeyCode> this._nodeyStore[id]
  }


  registerNodey(nodey : Nodey) :void{
    this._nodeyStore[nodey.id] = nodey
  }


  toJSON() : serialized_Nodey[]
  {
    return this._nodeyStore.map( (item : Nodey) => {
      if(item)
        return item.toJSON()
    })
  }


  dump() : void //for debugging only
  {
    console.log(this._nodeyStore)
  }
}
