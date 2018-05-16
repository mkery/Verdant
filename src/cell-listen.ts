
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
  Nodey
} from './nodey'


export
class CellListen
{
  cell : Cell
  astUtils : ASTUtils
  nodey : Nodey


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
      var output = this.cell.outputArea.model.toJSON()
      this.nodey = await this.astUtils.generateCodeNodey(text, output)
    }
    //TODO markdown and other cell types

    this.listen()
    this._ready.resolve(undefined);
  }

  private listen()
  {
    this.cell.editor.model.value.changed //listen in
    this.cell.editor.model.selections.changed //listen in
  }

  private _ready = new PromiseDelegate<void>();
}
