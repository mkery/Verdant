





export
abstract class Nodey
{
  uid : string //unique id
  number : number //chronological number
  run : string //id marking which run
  timestamp : Date //timestamp when created

  constructor(options: { [id: string] : any })
  {
    this.uid = options.uid
    this.number = options.number
    this.run = options.run
    this.timestamp = options.timestamp
  }

}


export
class NodeyOutput extends Nodey
{
  dependsOn: Nodey[]
  raw: {}

  constructor(options: { [id: string] : any })
  {
    super(options)
    this.raw = options // note for different output types, the data is all named differently
    this.dependsOn = (<any> options)['dependsOn']
  }
}


export
class NodeyCode extends Nodey
{
  type : string
  output: NodeyOutput[]
  content : Nodey[]
  line: number
  col: number
  //marker TODO

  constructor(options: { [id: string] : any })
  {
    super(options)
    this.type = options.type
    this.content = options.content
    this.output = (<any> options)['output']
    this.line = options.line
    this.col = options.col
  }
}


export
class NodeyLiteral extends NodeyCode
{
  literal: any

  constructor(options: { [id: string] : any })
  {
    super(options)
    this.literal = (<any> options)['literal']
  }
}


/**
 * A namespace for Nodey statics.
 */
export
namespace Nodey {

  export
  function fromJSON(jsn: {[id: string] : any}, output: {[id: string] : any}) : Nodey
  {
    var outNode : NodeyOutput[] = []
    if(output.length < 1)
      outNode = undefined
    else
    {
      for(var item in output)
        outNode.push( new NodeyOutput(output[item]) )
    }
    return dictToNodeys(jsn, outNode);
  }


  function dictToNodeys(dict: { [id: string] : any }, output : NodeyOutput[]) : Nodey
  {
    dict.output = output
    if(dict['literal'] !== undefined) //leaf node
      return new NodeyLiteral(dict)
    else
    {
        var n = new NodeyCode(dict)
        n.content = []
        for(var item in dict.content)
        {
          var child = dictToNodeys(dict.content[item], output)
          n.content.push(child)
        }
        return n
    }
  }

}
