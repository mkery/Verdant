import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { Checkpoint, CheckpointType, ChangeType } from "../model/checkpoint";

const DATE_HEADER = "Verdant-events-date-header";
const EVENT_ROW = "Verdant-events-row";
const EVENT_NOTEBOOK = "Verdant-events-notebook";
const EVENT_LABEL = "Verdant-events-label";
const EVENT_MAP = "Verdant-events-map";
const CELL = "v-VerdantPanel-runCellMap-cell";
const CELL_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const CELL_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const CELL_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";

export class EventMap extends Widget {
  readonly history: History;
  private date: number;

  constructor(history: History) {
    super();
    this.history = history;

    this.history.ready.then(async () => {
      await this.history.notebook.ready;
      this.build(this.history);
    });
  }

  build(history: History) {
    let checkpoints = history.checkpoints;
    checkpoints.all().forEach(event => {
      let time = event.timestamp;
      if (!this.date || !Checkpoint.sameDay(time, this.date)) {
        this.date = time;
        this.node.appendChild(this.buildDateHeader(this.date));
      }
      this.node.appendChild(this.buildEvent(event));
    });
  }

  addEvent(event: Checkpoint) {
    let time = event.timestamp;
    if (!this.date || !Checkpoint.sameDay(time, this.date)) {
      this.date = time;
      this.addToTop(this.buildDateHeader(this.date));
    }
    this.addToTop(this.buildEvent(event));
  }

  addToTop(div: HTMLElement) {
    this.node.insertBefore(div, this.node.getElementsByClassName(EVENT_ROW)[0]);
  }

  buildDateHeader(date: number): HTMLElement {
    let header = document.createElement("div");
    header.classList.add(DATE_HEADER);
    header.textContent = Checkpoint.formatDate(date);
    return header;
  }

  buildEvent(event: Checkpoint): HTMLElement {
    let row = document.createElement("div");
    row.classList.add(EVENT_ROW);

    let notebookNum = document.createElement("div");
    notebookNum.classList.add(EVENT_NOTEBOOK);
    notebookNum.textContent = "#" + event.notebook;
    row.appendChild(notebookNum);

    let eventTitle = "";
    switch (event.checkpointType) {
      case CheckpointType.ADD:
        eventTitle = "Cell added";
        break;
      case CheckpointType.DELETE:
        eventTitle = "Cell removed";
        break;
      case CheckpointType.RUN:
        eventTitle = "Run";
        break;
      case CheckpointType.SAVE:
        eventTitle = "Save";
        break;
      case CheckpointType.MOVED:
        eventTitle = "Cell moved";
        break;
    }

    let eventLabel = document.createElement("div");
    eventLabel.classList.add(EVENT_LABEL);
    eventLabel.textContent = eventTitle;
    row.appendChild(eventLabel);

    let eventMap = document.createElement("div");
    eventMap.classList.add(EVENT_MAP);
    eventMap.appendChild(this.buildMap(event));
    row.appendChild(eventMap);

    return row;
  }

  buildMap(event: Checkpoint): HTMLElement {
    let wrapper = document.createElement("div");
    let map = this.history.checkpoints.getCellMap(event);
    console.log("CELL MAP", map);
    map.forEach(cell => {
      let line = document.createElement("div");
      line.classList.add(CELL);
      let kind = cell.changeType;
      switch (kind) {
        case ChangeType.ADDED:
          line.classList.add(CELL_ADDED);
          break;
        case ChangeType.CHANGED:
          line.classList.add(CELL_CHANGED);
          break;
        case ChangeType.REMOVED:
          line.classList.add(CELL_REMOVED);
          break;
      }
      wrapper.appendChild(line);
    });

    return wrapper;
  }
}
