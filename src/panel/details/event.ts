import { Widget } from "@phosphor/widgets";
import { History } from "../../model/history";
import { Checkpoint, ChangeType } from "../../model/checkpoint";
import { NotebookEventLabel } from "./event-label";

const EVENT_ROW = "Verdant-events-row";
const EVENT_NOTEBOOK = "Verdant-events-notebook";
const EVENT_MAP = "Verdant-events-map";
const CELL = "v-VerdantPanel-runCellMap-cell";
const CELL_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const CELL_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const CELL_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const CELL_SAME = "v-VerdantPanel-runCellMap-cell-same";

export class NotebookEvent extends Widget {
  readonly notebook: number;
  readonly history: History;
  private map: HTMLElement;
  private label: NotebookEventLabel;

  constructor(history: History, event: Checkpoint, onClick: () => void) {
    super();
    this.history = history;
    this.notebook = event.notebook;
    this.node.classList.add(EVENT_ROW);
    this.node.addEventListener("click", onClick);
    this.build(event);
  }

  public addEvent(event: Checkpoint) {
    this.label.addEvent(event);
    this.addEventToMap(event);
  }

  private build(event: Checkpoint) {
    this.label = new NotebookEventLabel(event);
    this.node.appendChild(this.label.node);

    // build the map side
    let mapWrapper = this.buildMapWrapper(event);
    this.node.appendChild(mapWrapper);

    this.map = this.buildMap(event);
    this.map.classList.add(EVENT_NOTEBOOK);
    mapWrapper.appendChild(this.map);
  }

  private buildMapWrapper(event: Checkpoint): HTMLElement {
    let eventMap = document.createElement("div");
    eventMap.classList.add(EVENT_MAP);

    let notebookNum = document.createElement("div");
    notebookNum.classList.add(EVENT_NOTEBOOK);
    // add 1 to number to not start at 0
    notebookNum.textContent = "#" + (event.notebook + 1);
    eventMap.appendChild(notebookNum);
    return eventMap;
  }

  private buildMap(event: Checkpoint): HTMLElement {
    let wrapper = document.createElement("div");
    let map = this.history.checkpoints.getCellMap(event);

    map.forEach(cell => {
      let line = document.createElement("div");
      line.classList.add(CELL);

      let kind = cell.changeType;
      switch (kind) {
        case ChangeType.ADDED:
          line.classList.add("target");
          line.classList.add(CELL_ADDED);
          break;
        case ChangeType.CHANGED:
          line.classList.add("target");
          line.classList.add(CELL_CHANGED);
          break;
        case ChangeType.REMOVED:
          line.classList.add("target");
          line.classList.add(CELL_REMOVED);
          break;
        case ChangeType.SAME:
          line.classList.add("target");
          line.classList.add(CELL_SAME);
          break;
      }
      wrapper.appendChild(line);
    });

    return wrapper;
  }

  private addEventToMap(event: Checkpoint): void {
    let notebook = this.history.store.getNotebook(this.notebook);
    event.targetCells.forEach(cell => {
      let kind = cell.changeType;
      let index = notebook.cells.indexOf(cell.node);
      console.log("THE CELL TO UPDATE IS", cell, index, notebook.cells);
      let line = this.map.getElementsByClassName(CELL)[index];
      switch (kind) {
        case ChangeType.ADDED:
          line.classList.add("target");
          line.classList.add(CELL_ADDED);
          break;
        case ChangeType.CHANGED:
          line.classList.add("target");
          line.classList.add(CELL_CHANGED);
          break;
        case ChangeType.REMOVED:
          line.classList.add("target");
          line.classList.add(CELL_REMOVED);
          break;
        case ChangeType.SAME:
          if (
            // don't overwrite non-same events
            line.classList.contains("target") &&
            !line.classList.contains(CELL_SAME)
          )
            break;
          else line.classList.add("target");
          line.classList.add(CELL_SAME);
          break;
      }
    });
  }
}
