import { Store } from "redux";
import { Cell } from "@jupyterlab/cells";
import { AST } from "../lilgit/analysis/ast";
import { History } from "../lilgit/history/";
import { VerNotebook } from "../lilgit/notebook";
import { VerCell } from "../lilgit/cell";
import { NotebookPanel } from "@jupyterlab/notebook";
import {
  showDetailOfNode,
  focusCell,
  updateCheckpoint,
  initEventMap,
} from "./redux/";
import { Nodey } from "../lilgit/nodey/";
import { VerdantLog } from "./logger";
import { NotebookEvent } from "../lilgit/notebook-events";

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
      // signal to load event map UI data
      this.store.dispatch(initEventMap());

      // connect to make sure inspector works with redux store
      history.inspector.targetChanged.connect((_: any, nodey: Nodey) => {
        this.store.dispatch(showDetailOfNode(nodey));
      });
    });
  }

  public async handleNotebookEvent(event: NotebookEvent) {
    let checkpoint = await super.handleNotebookEvent(event);
    this.store.dispatch(updateCheckpoint(checkpoint));
    let eventType = event.constructor.name;
    if (eventType === "SaveNotebook") this.logger.saveLog();
    return checkpoint;
  }

  public async focusCell(cell: Cell): Promise<VerCell> {
    let verCell = super.focusCell(cell);
    verCell.then((cell) => {
      if (cell) {
        let index = this.cells.indexOf(cell);
        this.store.dispatch(focusCell(index));
      }
    });
    return verCell;
  }
}
