import * as React from "react";
import { Checkpoint, CheckpointType } from "../../../lilgit/checkpoint";
import { connect } from "react-redux";
import { verdantState } from "../../redux/";

const LABEL = "Verdant-events-label";

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
  events: Checkpoint[];
};

type req_EventLabel_Props = {
  event_id: number | null;
  date_id: number;
  events?: Checkpoint[];
};
type EventLabel_Props = {
  events: Checkpoint[];
  eventCount: number;
} & req_EventLabel_Props;
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
    this.props.events.map((ev) => this.addEvent(ev, times));
    this.state = {
      times,
    };
  }

  render() {
    return <div className={LABEL}>{this.makeTimestamp()}</div>;
  }

  componentDidUpdate(prevProps) {
    if (this.props.eventCount !== prevProps.eventCount) {
      let times: timeLabel[] = [];
      this.props.events.map((ev) => this.addEvent(ev, times));
      this.setState({ times: times });
    }
  }

  // Create timestamp element
  makeTimestamp() {
    const times = this.state.times;
    if (times.length == 1) {
      return <div> {times[0].time} </div>;
    } else {
      let firstTime = times[0].time;
      return <div>{`${firstTime}...`}</div>;
    }
  }

  public addEvent(event: Checkpoint, times: timeLabel[]) {
    let time = Checkpoint.formatTime(event.timestamp);

    let matchTime = times.filter((item) => item.time === time)[0];
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
          save: 0,
        },
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
      save: 0,
    };

    events.forEach((ev) => {
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
  ownProps: req_EventLabel_Props
) => {
  if (ownProps.event_id !== null) {
    // regular case
    let eventList =
      state.eventView.dates[ownProps.date_id].events[ownProps.event_id];
    return {
      events: eventList.events,
      eventCount: eventList.events.length,
    };
  } else {
    // null case, for bundle labels
    return {
      events: ownProps.events ? ownProps.events : [],
      eventCount: ownProps.events ? ownProps.events.length : 0,
    };
  }
};

export default connect(mapStateToProps)(NotebookEventLabel);
