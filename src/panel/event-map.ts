import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { Checkpoint } from "../model/checkpoint";
import { NotebookEvent } from "./details/event";

const PANEL = "v-VerdantPanel-content";
const DATE_HEADER = "Verdant-events-date-header";
const EVENT_ROW = "Verdant-events-row";

export class EventMap extends Widget {
  readonly history: History;
  private date: number;
  private events: NotebookEvent[];

  constructor(history: History) {
    super();
    this.node.classList.add(PANEL);
    this.history = history;
    this.events = [];

    this.history.ready.then(async () => {
      await this.history.notebook.ready;
      this.build(this.history);
    });
  }

  build(history: History) {
    history.checkpoints.all().forEach(event => {
      this.addEvent(event);
    });
  }

  addEvent(event: Checkpoint) {
    let time = event.timestamp;
    if (!this.date || !Checkpoint.sameDay(time, this.date)) {
      this.date = time;
      this.addToTop(this.buildDateHeader(this.date));
    }

    let lastEvent = this.events[this.events.length - 1];
    if (lastEvent && lastEvent.notebook === event.notebook) {
      lastEvent.addEvent(event);
    } else {
      let newEvent = new NotebookEvent(this.history, event);
      this.events.push(newEvent);
      this.addToTop(newEvent.node);
    }
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
}
