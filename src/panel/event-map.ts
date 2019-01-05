import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { Checkpoint } from "../model/checkpoint";
import { NotebookEvent } from "./details/event";
import { VerdantPanel } from "./verdant-panel";
import { VersionSampler } from "./details/version-sampler";

const PANEL = "v-VerdantPanel-content";
const DATE_HEADER = "Verdant-events-date-header";
const DATE_GROUP = "Verdant-events-date-container";
const DATE_LABEL = "Verdant-events-date-header-label";

export class EventMap extends Widget {
  readonly history: History;
  readonly parentPanel: VerdantPanel;
  private date: number;
  private events: { [date: string]: NotebookEvent[] };

  constructor(history: History, panel: VerdantPanel) {
    super();
    this.node.classList.add(PANEL);
    this.history = history;
    this.parentPanel = panel;
    this.events = {};

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
    let onClick = () => this.parentPanel.openGhostBook(event.notebook);
    let time = event.timestamp;
    let date: string;
    if (!this.date || !Checkpoint.sameDay(time, this.date)) {
      this.date = time;
      this.node.insertBefore(
        this.buildDateHeader(this.date),
        this.node.firstChild
      );
      date = Checkpoint.formatDate(this.date);
      this.events[date] = [];
    } else {
      date = Checkpoint.formatDate(this.date);
    }

    let lastEvent = this.events[date][this.events[date].length - 1];
    if (lastEvent && lastEvent.notebook === event.notebook) {
      lastEvent.addEvent(event);
    } else {
      let newEvent = new NotebookEvent(this.history, event, onClick);
      this.events[date].push(newEvent);
      this.addToTop(newEvent.node);
    }
  }

  addToTop(div: HTMLElement) {
    let dateGroup = this.node.getElementsByClassName(DATE_GROUP)[0];
    dateGroup.insertBefore(div, dateGroup.children[0]);
  }

  buildDateHeader(date: number): HTMLElement {
    let wrapper = document.createElement("div");
    let content = document.createElement("div");
    content.classList.add(DATE_GROUP);
    let header = document.createElement("div");
    header.classList.add(DATE_HEADER);
    let textLabel = document.createElement("div");
    textLabel.classList.add(DATE_LABEL);
    let dateString = Checkpoint.formatDate(date);
    textLabel.textContent = dateString;

    let onOpen = () => (textLabel.textContent = dateString);
    let onClose = () => {
      textLabel.textContent =
        dateString + " (" + this.events[dateString].length + ")";
    };
    VersionSampler.addCaret(header, content, true, onOpen, onClose);
    header.appendChild(textLabel);

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    return wrapper;
  }
}
