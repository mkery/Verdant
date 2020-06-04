import * as React from "react";
import {Checkpoint, CheckpointType} from "../../../lilgit/model/checkpoint";
import {connect} from "react-redux";
import {verdantState} from "../../redux/index";

const EVENT_LABEL = "Verdant-events-label";

// Used to track the counts of each kind of event for label construction
interface eventCounts {
  added: number;
  deleted: number;
  run: number;
  load: number;
  save: number;
  moved: number;
}

type timeLabel = {
  time: string;
  eventCounts: eventCounts;
  events: Checkpoint[]
};
type EventLabel_Props = {
  events: Checkpoint[];
  event_id: number;
  date_id: number;
  eventCount: number;
};
type EventLabel_State = {
  times: timeLabel[];
};

class NotebookEventLabel extends React.Component<EventLabel_Props,
  EventLabel_State> {
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
      this.setState({times: times});
    }
  }

  // Create label for timestamp
  makeLabel() {
    const counts: eventCounts = {
      added: 0,
      deleted: 0,
      moved: 0,
      load: 0,
      run: 0,
      save: 0
    }

    this.state.times.forEach(t => {
      counts.added += t.eventCounts.added;
      counts.deleted += t.eventCounts.deleted;
      counts.moved += t.eventCounts.moved;
      counts.load += t.eventCounts.load;
      counts.run += t.eventCounts.run;
      counts.save += t.eventCounts.save;
    })

    let label = "";

    if (counts.added === 1) label += "Cell added, ";
    else if (counts.added > 1) label += `${counts.added} Cells added, `;

    if (counts.deleted === 1) label += "Cell removed, ";
    else if (counts.deleted > 1) label += `${counts.deleted} Cells removed, `;

    if (counts.moved === 1) label += "Cell moved, ";
    else if (counts.moved > 1) label += `${counts.moved} Cells moved, `;

    if (counts.run === 1) label += "Run, ";
    else if (counts.run > 1) label += `${counts.run} Runs, `;

    if (counts.load === 1) label += "Load, ";
    else if (counts.load > 1) label += `${counts.load} Loads, `;

    if (counts.save === 1) label += "Save, ";
    else if (counts.save > 1) label += `${counts.save} Saves, `;

    return label.slice(0, -2);
  }

  // Create timestamp element
  makeTimestamp() {
    const times = this.state.times;
    if (times.length == 1) {
      return <div> {`${times[0].time} ${this.makeLabel()}`} </div>;
    } else {
      return (<div>
        {`${times[0].time} - ${times[times.length - 1].time}
         ${this.makeLabel()}`}
      </div>);
    }
  }

  render() {
    return (
      <div className={EVENT_LABEL}>
          {this.makeTimestamp()}
      </div>
    );
  }

  public addEvent(event: Checkpoint, times: timeLabel[]) {
    let time = Checkpoint.formatTime(event.timestamp);

    let matchTime = times.filter(item => item.time === time)[0];
    if (!matchTime) {
      matchTime = {
        time: time,
        events: [],
        eventCounts: {
          added: 0,
          deleted: 0,
          moved: 0,
          load: 0,
          run: 0,
          save: 0
        }
      };
      times.push(matchTime);
    }

    // add to start since assume it will be a later time
    matchTime.events.unshift(event);
    matchTime.eventCounts = this.countEvents(matchTime.events);
  }

  private countEvents(events: Checkpoint[]): eventCounts {
    const counts: eventCounts = {
      added: 0,
      deleted: 0,
      moved: 0,
      load: 0,
      run: 0,
      save: 0
    }

    events.forEach(ev => {
      switch (ev.checkpointType) {
        case CheckpointType.ADD:
          counts.added++;
          break;
        case CheckpointType.DELETE:
          counts.deleted++;
          break;
        case CheckpointType.RUN:
          counts.run++;
          break;
        case CheckpointType.LOAD:
          counts.load++;
          break;
        case CheckpointType.SAVE:
          counts.save++;
          break;
        case CheckpointType.MOVED:
          counts.moved++;
          break;
      }
    });

    return counts;
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
