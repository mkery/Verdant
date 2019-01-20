import { NotebookPanel } from "@jupyterlab/notebook";
import { Cell, ICellModel } from "@jupyterlab/cells";
import { AST } from "../lilgit/analysis/ast";
import { History } from "../lilgit/model/history";
import { VerNotebook } from "../lilgit/components/notebook";
import { VerdantPanel } from "./panel/verdant-panel";
import { Ghost } from "./ghost-book/ghost";
import { NodeyCell } from "../lilgit/model/nodey";
import { Checkpoint } from "../lilgit/model/checkpoint";
import { VerCell } from "../lilgit/components/cell";

export class VerdantNotebook extends VerNotebook {
  private panel: VerdantPanel;
  private readonly openGhost: (hist: History, ver: number) => Ghost;
  private ghost: Ghost;

  constructor(
    notebookPanel: NotebookPanel,
    history: History,
    ast: AST,
    panel: VerdantPanel,
    openGhostBook: (hist: History, ver: number) => Ghost
  ) {
    super(history, ast, notebookPanel);
    this.panel = panel;
    this.openGhost = openGhostBook;
  }

  public get ghostBook(): Ghost {
    return this.ghost;
  }

  public showGhostBook(version: number) {
    if (!this.ghost) {
      this.ghost = this.openGhost(this.history, version);
      this.ghost.disposed.connect(() => {
        this.ghost = null;
      });
    } else this.ghost.showVersion(version);
  }

  public async run(cellModel: ICellModel): Promise<[NodeyCell, Checkpoint]> {
    let [newNodey, checkpoint] = await super.run(cellModel);

    // update display
    this.panel.updateCells(newNodey, checkpoint);
    return [newNodey, checkpoint];
  }

  public async createCell(
    cell: Cell,
    index: number,
    match: boolean
  ): Promise<[VerCell, Checkpoint]> {
    let [newCell, checkpoint] = await super.createCell(cell, index, match);
    this.panel.updateCells(newCell.lastSavedModel, checkpoint, index);
    return [newCell, checkpoint];
  }

  public deleteCell(index: number) {
    let [oldCell, checkpoint] = super.deleteCell(index);
    this.panel.updateCells(oldCell.lastSavedModel, checkpoint, index);
    return [oldCell, checkpoint];
  }

  public moveCell(cell: VerCell, oldPos: number, newPos: number) {
    let checkpoint = super.moveCell(cell, oldPos, newPos);
    this.panel.updateCells(cell.lastSavedModel, checkpoint, oldPos, newPos);
    return checkpoint;
  }

  public async switchCellType(
    index: number,
    newCell: Cell
  ): Promise<[VerCell, Checkpoint]> {
    let [verCell, checkpoint] = await super.switchCellType(index, newCell);
    // update display
    this.panel.updateCells(verCell.lastSavedModel, checkpoint);
    return [verCell, checkpoint];
  }

  public focusCell(cell: VerCell) {
    let index = this.cells.indexOf(cell);
    this.panel.highlightCell(index);
  }

  public async save(): Promise<[NodeyCell[], Checkpoint]> {
    let [changedCells, checkpoint] = await super.save();
    this.panel.updateCells(changedCells, checkpoint);
    return [changedCells, checkpoint];
  }
}
