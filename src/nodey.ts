





export
abstract class Nodey
{
  number : number //chronological number
  run : string //id marking which run
  timestamp : Date //timestamp when created

  constructor(options: { [id: string] : any })
  {
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

  static EMPTY()
  {
    return new NodeyOutput({'raw': {}, 'dependsOn': []})
  }
}


export
class NodeyCode extends Nodey
{
  type : string
  output: NodeyOutput[]
  content : Nodey[]
  start: number
  end: number
  literal: any
  //marker TODO

  constructor(options: { [id: string] : any })
  {
    super(options)
    this.type = options.type
    this.content = options.content
    this.output = (<any> options)['output']
    this.literal = options.literal
    this.start = options.start
    this.end = options.end
  }

  static EMPTY()
  {
    return new NodeyCode({'type': 'EMPTY', 'content': []})
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
    //console.log("DICT IS", dict)
    dict.output = output
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
