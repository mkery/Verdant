import {
  NotebookPanel, Notebook
} from '@jupyterlab/notebook';

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
  nodey: Nodey


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
    
    console.log("Notebook active", this.notebook)
    await this.astUtils.ready
    this.notebook.widgets.forEach( (item, index) => {
      console.log("found cell", item)//TODO check if code cell
      var text : string = item.editor.model.value.text
      this.astUtils.generateAST(text)
    })
    this._ready.resolve(undefined);
  }

  private _ready = new PromiseDelegate<void>();
}
