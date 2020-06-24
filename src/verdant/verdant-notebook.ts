import { Store } from "redux";
import { Cell } from "@jupyterlab/cells";
import { AST } from "../lilgit/analysis/ast";
import { History } from "../lilgit/model/history";
import { VerNotebook } from "../lilgit/components/notebook";
import { VerCell } from "../lilgit/components/cell";
import { NotebookPanel } from "@jupyterlab/notebook";
import { inspectNode, switchTab, ActiveTab } from "./redux/index";
import { updateCheckpoint } from "./redux/events";
import { Nodey } from "../lilgit/model/nodey";
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
      history.inspector.targetChanged.connect((_: any, nodey: Nodey) => {
        this.store.dispatch(inspectNode(nodey));
        this.store.dispatch(switchTab(ActiveTab.Artifact_Details));
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
    let verCell = await super.focusCell(cell);
    if (verCell) {
      // TODO let index = this.cells.indexOf(verCell);
      // TODO this.panel.highlightCell(index);
    }
    return verCell;
  }
}
