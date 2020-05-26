import { Store } from "redux";
import { Cell, ICellModel } from "@jupyterlab/cells";
import { AST } from "../lilgit/analysis/ast";
import { History } from "../lilgit/model/history";
import { VerNotebook } from "../lilgit/components/notebook";
import { NodeyCell } from "../lilgit/model/nodey";
import { Checkpoint } from "../lilgit/model/checkpoint";
import { VerCell } from "../lilgit/components/cell";
import { NotebookPanel } from "@jupyterlab/notebook";
import { inspectNode, switchTab, ActiveTab } from "./redux/index";
import { updateCheckpoint } from "./redux/events";
import { Nodey } from "../lilgit/model/nodey";
import { VerdantLog } from "./logger";

export class VerdantNotebook extends VerNotebook {
  private store: Store;
  readonly logger: VerdantLog;

  constructor(
    history: History,
    ast: AST,
    notebookArea: NotebookPanel,
    store: Store,
    logger: VerdantLog
  ) {
    super(history, ast, notebookArea);
    this.store = store;
    this.logger = logger;
    this.logger.setNotebook(this);

    // connect to keep inspect up to date in model and UI side
    history.ready.then(() => {
      history.inspector.targetChanged.connect((_: any, nodey: Nodey) => {
        this.store.dispatch(inspectNode(nodey));
        this.store.dispatch(switchTab(ActiveTab.Artifact_Details));
      });
    });
  }

  public async run(cellModel: ICellModel): Promise<[NodeyCell, Checkpoint]> {
    let [newNodey, checkpoint] = await super.run(cellModel);

    // update display
    this.store.dispatch(updateCheckpoint(checkpoint));
    return [newNodey, checkpoint];
  }

  public async createCell(
    cell: Cell,
    index: number,
    match: boolean
  ): Promise<[VerCell, Checkpoint]> {
    let [newCell, checkpoint] = await super.createCell(cell, index, match);
    if (newCell) {
      // update display
      this.store.dispatch(updateCheckpoint(checkpoint));
      return [newCell, checkpoint];
    }
  }

  public async deleteCell(index: number): Promise<[VerCell, Checkpoint]> {
    let [oldCell, checkpoint] = await super.deleteCell(index);
    // update display
    this.store.dispatch(updateCheckpoint(checkpoint));
    return [oldCell, checkpoint];
  }

  public async moveCell(
    cell: VerCell,
    oldPos: number,
    newPos: number
  ): Promise<Checkpoint> {
    let checkpoint = await super.moveCell(cell, oldPos, newPos);
    // update display
    this.store.dispatch(updateCheckpoint(checkpoint));
    return checkpoint;
  }

  public async switchCellType(
    index: number,
    newCell: Cell
  ): Promise<[VerCell, Checkpoint]> {
    let [verCell, checkpoint] = await super.switchCellType(index, newCell);
    // update display
    this.store.dispatch(updateCheckpoint(checkpoint));
    return [verCell, checkpoint];
  }

  public async focusCell(cell: Cell): Promise<VerCell> {
    let verCell = await super.focusCell(cell);
    if (verCell) {
      // TODO let index = this.cells.indexOf(verCell);
      // TODO this.panel.highlightCell(index);
    }
    return verCell;
  }

  public async save(): Promise<[NodeyCell[], Checkpoint]> {
    let [changedCells, checkpoint] = await super.save();
    // update display
    this.store.dispatch(updateCheckpoint(checkpoint));
    this.logger.saveLog();
    return [changedCells, checkpoint];
  }
}
