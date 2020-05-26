import * as React from "react";
import { Checkpoint, CheckpointType } from "../../../lilgit/model/checkpoint";
import { connect } from "react-redux";
import { verdantState } from "../../redux/index";

const EVENT_LABEL = "Verdant-events-label";

type timeLabel = { time: string; label: string; events: Checkpoint[] };
type EventLabel_Props = {
  events: Checkpoint[];
  event_id: number;
  date_id: number;
  eventCount: number;
};
type EventLabel_State = {
  times: timeLabel[];
};

class NotebookEventLabel extends React.Component<
  EventLabel_Props,
  EventLabel_State
> {
  constructor(props: EventLabel_Props) {
    super(props);
    let times: timeLabel[] = [];
    this.props.events.map(ev => this.addEvent(ev, times));
    this.state = {
      times
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.eventCount !== prevProps.eventCount) {
      let times: timeLabel[] = [];
      this.props.events.map(ev => this.addEvent(ev, times));
      this.setState({ times: times });
    }
  }

  render() {
    return (
      <div className={EVENT_LABEL}>
        <div>
          {this.state.times.map((time, index) => {
            return <div key={index}>{`${time.time} ${time.label}`}</div>;
          })}
        </div>
      </div>
    );
  }

  public addEvent(event: Checkpoint, times: timeLabel[]) {
    let time = Checkpoint.formatTime(event.timestamp);

    let matchTime = times.filter(item => item.time === time)[0];
    if (!matchTime) {
      matchTime = { time: time, events: [], label: "" };
      times.push(matchTime);
    }

    // add to start since assume it will be a later time
    matchTime.events.unshift(event);
    matchTime.label = this.labelEvent(matchTime.events);
  }

  private labelEvent(events: Checkpoint[]): string {
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

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<EventLabel_Props>
) => {
  let eventList = state.dates[ownProps.date_id].events[ownProps.event_id];
  return {
    events: eventList.events,
    eventCount: eventList.events.length
  };
};

export default connect(mapStateToProps)(NotebookEventLabel);
