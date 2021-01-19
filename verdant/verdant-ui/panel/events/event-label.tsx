import * as React from "react";
import { Checkpoint } from "../../../verdant-model/checkpoint";

const LABEL = "Verdant-events-label";

type timeLabel = {
  time: string;
  events: Checkpoint[];
};

type req_EventLabel_Props = {
  events?: Checkpoint[];
};
type EventLabel_Props = {
  events: Checkpoint[];
} & req_EventLabel_Props;
type EventLabel_State = {
  times: timeLabel[];
};

class NotebookEventLabel extends React.Component<
  EventLabel_Props,
  EventLabel_State
> {
  private _isMounted = false;

  constructor(props: EventLabel_Props) {
    super(props);
    let times: timeLabel[] = [];
    this.props.events?.map((ev) => this.addEvent(ev, times));
    this.state = {
      times,
    };
  }

  render() {
    return <div className={LABEL}>{this.makeTimestamp()}</div>;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps) {
    if (
      this._isMounted &&
      this.props.events?.length !== prevProps.events?.length
    ) {
      let times: timeLabel[] = [];
      this.props.events?.map((ev) => this.addEvent(ev, times));
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
      };
      times.push(matchTime);
    }

    // add to start since assume it will be a later time
    matchTime.events.unshift(event);
  }
}

export default NotebookEventLabel;
