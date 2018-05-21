import * as CodeMirror
  from 'codemirror';


import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';



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
  start: {'line' : number, 'ch' : number}
  end: {'line' : number, 'ch' : number}
  literal: any
  marker: CodeMirror.TextMarker

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
  function dictToCodeNodeys(dict: { [id: string] : any }) : NodeyCode
  {
    //console.log("DICT IS", dict)
    var n = new NodeyCode(dict)
    n.content = []
    for(var item in dict.content)
    {
      var child = dictToCodeNodeys(dict.content[item])
      n.content.push(child)
    }
    return n
  }

  export
  function placeMarkers(nodey : NodeyCode, editor : CodeMirrorEditor) : void
  {
    if(nodey.literal) //if this node is has shown concrete text
    {
      nodey.marker = editor.doc.markText(nodey.start, nodey.end)
    }
  }
}
