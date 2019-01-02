import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { GhostCell } from "./ghost-cell";
import { Checkpoint } from "../model/checkpoint";

const GHOST_BOOK = "v-Verdant-GhostBook";
const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";
const TOOLBAR = "jp-Toolbar";
const GHOST_TOOLBAR = "v-Verdant-GhostBook-header";
const GHOST_CELLAREA = "v-Verdant-GhostBook-cellArea";

export class Ghost extends Widget {
  readonly history: History;
  private ver: number;
  private cellArea: HTMLElement;
  private toolbar: HTMLElement;

  constructor(history: History, ver: number) {
    super();
    let file = history.notebook.name;
    this.id = "ghostbook-verdant";
    this.title.label = "#" + (ver + 1) + " of " + file;
    this.title.iconClass = GHOST_BOOK_ICON;
    this.title.closable = true;
    this.history = history;
    this.ver = ver;

    /* Start building the view */
    this.node.classList.add(GHOST_BOOK);
    this.toolbar = document.createElement("div");
    this.toolbar.classList.add(TOOLBAR);
    this.toolbar.classList.add(GHOST_TOOLBAR);
    this.node.appendChild(this.toolbar);
    this.buildToolbar();
    this.cellArea = document.createElement("div");
    this.cellArea.classList.add(GHOST_CELLAREA);
    this.node.appendChild(this.cellArea);
    this.build();
  }

  public showVersion(ver: number) {
    if (ver !== this.ver) {
      let file = this.history.notebook.name;
      this.ver = ver;
      this.title.label = "#" + (ver + 1) + " of " + file;
      this.build();
      this.buildToolbar();
    }
  }

  close() {
    super.close();
    super.dispose();
  }

  public versionShowing() {
    return this.ver;
  }

  private build() {
    this.cellArea.innerHTML = "";
    let notebook = this.history.store.getNotebook(this.ver);
    let events = this.history.checkpoints.getByNotebook(this.ver);

    let selectCell = (cell: GhostCell) => {
      if (!cell.hasFocus()) {
        cells.forEach(item => item.blur());
        cell.focus();
      }
    };

    let cells: GhostCell[] = [];
    events.forEach(ev => {
      ev.targetCells.forEach(cell => {
        let index = notebook.cells.indexOf(cell.node);
        if (!cells[index])
          cells[index] = new GhostCell(this.history, cell.node, selectCell, ev);
        else cells[index].addEvent(ev);
      });
    });

    cells.forEach(cell => {
      cell.build();
      this.cellArea.appendChild(cell.node);
    });
  }

  private buildToolbar() {
    this.toolbar.innerHTML = "";

    let notebook = this.history.store.getNotebook(this.ver);
    let created = this.history.checkpoints.get(notebook.created);
    let time =
      Checkpoint.formatDate(created.timestamp) +
      " " +
      Checkpoint.formatTime(created.timestamp);
    let label = document.createElement("div");
    label.textContent =
      "Viewing version #" + this.ver + " of notebook " + " from " + time;

    this.toolbar.appendChild(label);
  }
}
