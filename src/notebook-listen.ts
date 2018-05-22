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
  CellListen
} from './cell-listen'

import{
  KernelListen
} from './kernel-listen'

import{
  Nodey
} from './nodey'


export
class NotebookListen
{
  notebook : Notebook; //the currently active notebook Verdant is working on
  notebookPanel : NotebookPanel
  kernUtil : KernelListen
  astUtils : ASTUtils
  cells: Map<Cell, CellListen>
  activeCell : Cell


  constructor(notebookPanel : NotebookPanel, astUtils : ASTUtils){
    this.notebookPanel = notebookPanel
    this.astUtils = astUtils
    this.cells = new Map<Cell, CellListen>()
    this.init()
  }

  get ready(): Promise<void> {
    return this._ready.promise
  }

  get nodey(): Nodey[] {
    var arr : Nodey[] = []
    this.cells.forEach((value, key) => { arr.push(value.nodey) })
    return arr
  }

  private async init()
  {
    await this.notebookPanel.ready
    this.notebook = this.notebookPanel.notebook
    this.kernUtil = new KernelListen(this.notebookPanel.session)
    this.astUtils.setKernUtil(this.kernUtil)
    await this.astUtils.ready

    var cellsReady : Promise<void>[] = []
    this.notebook.widgets.forEach( (item, index) => {
      if(item instanceof Cell)
      {
        var cell = new CellListen(item, this.astUtils)
        this.cells.set(item, cell)
        cellsReady.push(cell.ready)
      }
    })
    await Promise.all(cellsReady)
    console.log("Loaded Notebook", this.nodey)
    this.focusCell(this.notebook.activeCell)
    this.listen()
    this._ready.resolve(undefined);
  }


  focusCell(cell : Cell) : void
  {
    if(cell instanceof CodeCell)
      this.cells.get(cell).focus()
    if(this.activeCell && this.activeCell instanceof CodeCell)
      this.cells.get(this.activeCell).blur()
    this.activeCell = cell
  }


  private listen()
  {
    this.notebook.activeCellChanged.connect((sender: any, cell: Cell) => {
      this.focusCell(cell)
    })
  }

  private _ready = new PromiseDelegate<void>();
}
