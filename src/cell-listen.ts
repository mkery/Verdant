
import {
  Cell, CodeCell
} from '@jupyterlab/cells';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  ASTUtils
} from './ast-utils';

import{
  Nodey, NodeyOutput, NodeyCode
} from './nodey'

import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';


export
class CellListen
{
  cell : Cell
  astUtils : ASTUtils
  nodey : NodeyCode


  constructor(cell : Cell, astUtils : ASTUtils){
    this.cell = cell
    this.astUtils = astUtils
    this.init()
  }

  get ready(): Promise<void> {
    return this._ready.promise
  }

  private async init()
  {
    if(this.cell instanceof CodeCell)
    {
      var text : string = this.cell.editor.model.value.text
      var outNode = this.outputToNodey()
      this.nodey = await this.astUtils.generateCodeNodey(text, {'output' : outNode, 'run': 0})
      if(this.cell.editor instanceof CodeMirrorEditor)
        Nodey.placeMarkers(this.nodey, this.cell.editor)
    }
    //TODO markdown and other cell types

    this.listen()
    this._ready.resolve(undefined);
  }


  private outputToNodey() : NodeyOutput[]
  {
    if(this.cell instanceof CodeCell)
    {
      var output = this.cell.outputArea.model.toJSON()
      var outNode : NodeyOutput[] = []
      if(output.length < 1)
        outNode = undefined
      else
      {
        for(var item in output)
          outNode.push( new NodeyOutput(output[item]) )
      }
      return outNode
    }
  }


  private listen() : void
  {
    this.cell.editor.model.value.changed //listen in
    this.cell.editor.model.selections.changed //listen in
  }

  private _ready = new PromiseDelegate<void>();
}
