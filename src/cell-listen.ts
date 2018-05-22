
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
  NodeyOutput, NodeyCode
} from './nodey'

import * as CodeMirror
  from 'codemirror';

import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import{
  Indicator
} from './indicator'


export
class CellListen
{
  cell : Cell
  astUtils : ASTUtils
  nodey : NodeyCode
  indicator : Indicator


  constructor(cell : Cell, astUtils : ASTUtils){
    this.cell = cell
    this.astUtils = astUtils
    this.init()
  }

  get ready(): Promise<void> {
    return this._ready.promise
  }

  public focus() : void
  {
    console.log("Active!", this.cell, this.cell.inputArea.promptNode)
    this.indicator.versionNum = 0
    this.indicator.focus()
  }

  public blur() : void
  {
    this.indicator.blur()
  }

  private async init()
  {
    if(this.cell instanceof CodeCell)
    {
      var text : string = this.cell.editor.model.value.text
      var outNode = this.outputToNodey()
      this.nodey = await this.astUtils.generateCodeNodey(text, {'output' : outNode, 'run': 0})
      //if(this.cell.editor instanceof CodeMirrorEditor)
      //  Nodey.placeMarkers(this.nodey, this.cell.editor)
    }
    //TODO markdown and other cell types

    this.indicator = new Indicator()
    var node = this.cell.inputArea.promptNode
    node.parentNode.insertBefore(this.indicator.node, node.nextSibling)

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
    if(this.cell.editor instanceof CodeMirrorEditor)
    {
      var editor = <CodeMirrorEditor> this.cell.editor
      //editor.model.value.changed //listen in
      //editor.model.selections.changed //listen in

      CodeMirror.on(editor.doc, 'change', (instance : CodeMirror.Editor, change : CodeMirror.EditorChange) => {
        console.log("there was a change!", change)
        this.astUtils.repairAST(this.nodey, change, editor)
      })
    }

  }

  private _ready = new PromiseDelegate<void>();
}
