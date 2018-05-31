import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  ASTGenerate
} from './ast-generate';

import {
  Model
} from './model'



export
abstract class Nodey
{
  node_id: number //id for this node
  number : number //chronological number
  run : string //id marking which run
  timestamp : Date //timestamp when created
  pendingUpdate : string

  constructor(options: { [id: string] : any })
  {
    this.node_id = options.node_id
    this.number = options.number || 0
    this.run = options.run
    this.timestamp = options.timestamp
  }

  abstract toJSON(): { [id: string] : any }
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


  toJSON(): serialized_NodeyOutput
  {
    return {'number': this.number, 'output': this.raw}//TODO
  }
}

export
interface serialized_Nodey {
    number: number,
    run?: number //TODO
}

export
interface serialized_NodeyOutput extends serialized_Nodey{
  output?: {[key: string]: any}
}

export
interface serialized_NodeyCode extends serialized_Nodey{
    type: string,
    output?: serialized_NodeyOutput[],
    literal?: any,
    start?: {'line' : number, 'ch' : number},
    end?: {'line' : number, 'ch' : number}
    nodey?: serialized_NodeyCode[]
}

export
class NodeyCode extends Nodey
{
  type : string
  output: NodeyOutput[]
  content : NodeyCode[]
  start: {'line' : number, 'ch' : number}
  end: {'line' : number, 'ch' : number}
  literal: any
  parent : NodeyCode
  right : NodeyCode

  constructor(options: { [id: string] : any })
  {
    super(options)
    this.type = options.type
    this.content = options.content
    this.output = (<any> options)['output']
    this.literal = options.literal
    this.start = options.start
    this.end = options.end
    this.parent = options.parent
    this.right = options.right
  }


  toJSON(): serialized_NodeyCode
  {
    var jsn : serialized_NodeyCode = {'type': this.type, 'number': this.number}
    if(this.literal)
      jsn.literal = this.literal
    if(this.output)
    {
      var output = this.output.map((output) => output.toJSON())
      if(this.output.length > 0)
        jsn.output = output
    }
    if(this.content)
    {
      var content = this.content.map((nodey) => nodey.toJSON())
      if(content.length > 0)
        jsn.nodey = content
    }
    return jsn
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
  function dictToCodeNodeys(dict: { [id: string] : any }, historyModel: Model, prior: NodeyCode = null) : NodeyCode
  {
    dict.node_id = astGen.newNodeyID()
    dict.start.line -=1 // convert the coordinates of the range to code mirror style
    dict.end.line -=1
    console.log("PRIOR IS", prior)
    var n = new NodeyCode(dict)
    if(prior)
      prior.right = n
    prior = null

    n.content = []
    for(var item in dict.content)
    {
      var child = dictToCodeNodeys(dict.content[item], astGen, prior)
      child.parent = n
      if(prior)
        prior.right = child
      n.content.push(child)
      prior = child
    }
    return n
  }

  export
  function placeMarkers(nodey : NodeyCode, editor : CodeMirrorEditor) : void
  {
    if(nodey.literal) //if this node is has shown concrete text
    {
      var div = document.createElement('div')
      div.classList.add('verd-marker')
      editor.doc.markText(nodey.start, nodey.end, {'css': 'background-color: pink'})
    }
    for(var i in nodey.content)
      this.placeMarkers(nodey.content[i], editor)
  }
}
