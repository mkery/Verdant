import { Widget } from "@phosphor/widgets";
import { Checkpoint, CheckpointType } from "../../model/checkpoint";

const EVENT_LABEL = "Verdant-events-label";

export class NotebookEventLabel extends Widget {
  private times: {
    time: string;
    events: Checkpoint[];
  }[];

  constructor(event: Checkpoint) {
    super();
    this.times = [];
    this.node.classList.add(EVENT_LABEL);

    //build the label
    this.addEvent(event);
  }

  public addEvent(event: Checkpoint) {
    let time = Checkpoint.formatTime(event.timestamp);

    let matchTime = this.times.filter(item => item.time === time)[0];
    if (!matchTime) {
      matchTime = { time: time, events: [] };
      this.times.push(matchTime);
    }

    // add to start since assume it will be a later time
    matchTime.events.unshift(event);

    // re-build
    this.buildEventLabel();
  }

  private buildEventLabel() {
    this.node.innerHTML = "";
    let dateLabel = document.createElement("div");
    this.times.forEach(time => {
      let label = document.createElement("div");
      let eventTitle = this.addEventLabel(time.events);
      label.textContent = time.time + " " + eventTitle;
      dateLabel.appendChild(label);
    });
    this.node.appendChild(dateLabel);
  }

  private addEventLabel(events: Checkpoint[]): string {
    let eventTitle = "";
    let added = 0;
    let deleted = 0;
    let run = 0;
    let load = 0;
    let save = 0;
    let moved = 0;
    let total = 0;

    events.forEach(ev => {
      switch (ev.checkpointType) {
        case CheckpointType.ADD:
          added++;
          total++;
          break;
        case CheckpointType.DELETE:
          deleted++;
          total++;
          break;
        case CheckpointType.RUN:
          run++;
          total++;
          break;
        case CheckpointType.LOAD:
          load++;
          total++;
          break;
        case CheckpointType.SAVE:
          save++;
          total++;
          break;
        case CheckpointType.MOVED:
          moved++;
          total++;
          break;
      }
    });

    if (added === 1) eventTitle = "Cell added";
    if (added > 1) eventTitle = added + " Cells added";
    total -= added;

    if (total > 0 && deleted > 0 && eventTitle.length > 0) eventTitle += ", ";
    if (deleted === 1) eventTitle += "Cell removed";
    if (deleted > 1) eventTitle += deleted + " Cells removed";
    total -= deleted;

    if (total > 0 && run > 0 && eventTitle.length > 0) eventTitle += ", ";
    if (run === 1) eventTitle += "Run";
    if (run > 1) eventTitle += " Runs";
    total -= run;

    if (total > 0 && load > 0 && eventTitle.length > 0) eventTitle += ", ";
    if (load > 0) eventTitle += "Load";
    total -= load;

    if (total > 0 && save > 0 && eventTitle.length > 0) eventTitle += ", ";
    if (save > 0) eventTitle += "Save";
    total -= save;

    if (total > 0 && eventTitle.length > 0) eventTitle += ", ";
    if (moved === 1) eventTitle += "Cell Moved";
    if (moved > 1) eventTitle += moved + " Cells Moved";
    total -= moved;

    return eventTitle;
  }
}
