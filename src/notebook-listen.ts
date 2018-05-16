import {
  NotebookPanel, Notebook
} from '@jupyterlab/notebook';

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
class NotebookListen
{
  notebook : Notebook; //the currently active notebook Verdant is working on
  notebookPanel : NotebookPanel
  astUtils : ASTUtils
  cells: Nodey[]


  constructor(notebookPanel : NotebookPanel, astUtils : ASTUtils){
    this.notebookPanel = notebookPanel
    this.astUtils = astUtils
    this.init()
  }

  get ready(): Promise<void> {
    return this._ready.promise
  }

  private async init()
  {
    await this.notebookPanel.ready
    this.notebook = this.notebookPanel.notebook
    await this.astUtils.ready

    var cells : Promise<Nodey>[] = []
    this.notebook.widgets.forEach( (item, index) => {
      if(item instanceof Cell)
      {
        if(item instanceof CodeCell)
        {
          var text : string = item.editor.model.value.text
          var output = item.outputArea.model.toJSON()
          var nodey = this.astUtils.generateCodeNodey(text, output)
          if(nodey)
            cells.push(nodey)
        }
        //TODO markdown and other cell types
      }
    })
    this.cells = await Promise.all(cells)
    console.log("Loaded Notebook", this.cells)
    this._ready.resolve(undefined);
  }

  private _ready = new PromiseDelegate<void>();
}
