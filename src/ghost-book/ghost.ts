import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { GhostCell } from "./ghost-cell";
import { Checkpoint, CheckpointType } from "../model/checkpoint";

const GHOST_BOOK = "v-Verdant-GhostBook";
const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";
const TOOLBAR = "jp-Toolbar";
const GHOST_TOOLBAR = "v-Verdant-GhostBook-header";
const GHOST_TOOLBAR_ROW = "v-Verdant-GhostBook-header-row";
const GHOST_TOOLBAR_LABEL = "v-Verdant-GhostBook-header-label";
const GHOST_CELLAREA = "v-Verdant-GhostBook-cellArea";

export class Ghost extends Widget {
  readonly history: History;
  private ver: number;
  private cellArea: HTMLElement;
  private toolbar: HTMLElement;
  private ghostCells: GhostCell[];

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

  private get selectCell() {
    return (cell: GhostCell) => {
      if (!cell.hasFocus()) {
        this.ghostCells.forEach(item => item.blur());
        cell.focus();
      }
    };
  }

  private build() {
    this.cellArea.innerHTML = "";
    let notebook = this.history.store.getNotebook(this.ver);
    let events = this.history.checkpoints.getByNotebook(this.ver);

    let cells: GhostCell[] = notebook.cells.map(cell => {
      return new GhostCell(this.history, cell, this.selectCell);
    });
    let deletedCells: { cell: GhostCell; index: number }[] = [];
    events.forEach(ev => {
      ev.targetCells.forEach(cell => {
        let index = notebook.cells.indexOf(cell.node);
        if (index < 0 && ev.checkpointType === CheckpointType.DELETE) {
          let ghostCell = new GhostCell(
            this.history,
            cell.node,
            this.selectCell,
            ev
          );
          deletedCells.push({ cell: ghostCell, index: cell.index });
        } else cells[index].addEvent(ev);
      });
    });

    // to not mess up the other indices
    deletedCells.forEach(item => {
      cells.splice(item.index, 0, item.cell);
    });

    cells.forEach(cell => {
      this.cellArea.appendChild(cell.node);
      if (cell.events.length > 0) cell.build();
      else cell.hide();
    });

    this.ghostCells = cells;
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
    label.classList.add(GHOST_TOOLBAR_ROW);
    label.textContent =
      "Viewing version #" + (this.ver + 1) + " of notebook " + " from " + time;
    this.toolbar.appendChild(label);

    let optionRow = document.createElement("div");
    optionRow.classList.add(GHOST_TOOLBAR_ROW);

    /* Toggle button: https://codepen.io/mallendeo/pen/eLIiG
    <input class="tgl tgl-light" id="cb1" type="checkbox"/>
    <label class="tgl-btn" for="cb1"></label>
    */
    let tglWrapper = document.createElement("div");
    tglWrapper.classList.add(GHOST_TOOLBAR_LABEL);
    let button = document.createElement("input");
    button.id = "ghostTgl";
    button.classList.add("tgl");
    button.classList.add("tgl-light");
    button.classList.add("checked");
    tglWrapper.appendChild(button);
    let buttonLabel = document.createElement("label");
    buttonLabel.classList.add("tgl-btn");
    buttonLabel.setAttribute("for", "ghostTgl");
    tglWrapper.appendChild(buttonLabel);
    optionRow.appendChild(tglWrapper);

    buttonLabel.addEventListener("mouseup", () => {
      if (button.classList.contains("checked")) {
        button.classList.remove("checked");
        this.showUnaffectedCells();
      } else {
        button.classList.add("checked");
        this.hideUnaffectedCells();
      }
    });

    let textLabel = document.createElement("div");
    textLabel.classList.add(GHOST_TOOLBAR_LABEL);
    textLabel.textContent = "show only affected cells";
    optionRow.appendChild(textLabel);

    this.toolbar.appendChild(optionRow);
  }

  private hideUnaffectedCells() {
    this.ghostCells.forEach(item => {
      if (item.events.length < 1) item.hide();
    });
  }

  private showUnaffectedCells() {
    let notebook = this.history.store.getNotebook(this.ver);
    for (var index = 0; index < notebook.cells.length; index++) {
      let item = this.ghostCells[index];
      item.show();
    }
  }
}
