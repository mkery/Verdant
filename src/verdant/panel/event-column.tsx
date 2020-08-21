import * as React from "react";
import { History } from "../../lilgit/history/";
import { Checkpoint } from "../../lilgit/checkpoint";
import NotebookEventDate from "./events/event-date";
import { connect } from "react-redux";
import { verdantState, dateState } from "../redux/";

const PANEL = "v-VerdantPanel-content";

type EventColumn_Props = {
  ready: boolean;
  history: History;
  currentEvent: Checkpoint;
  dates: dateState[];
};

class EventColumn extends React.Component<EventColumn_Props> {
  render() {
    if (this.props.ready) {
      return (
        <div className={PANEL}>
          {this.props.dates.map((_, index) => {
            let reverse = this.props.dates.length - 1 - index;
            return <NotebookEventDate key={reverse} date_id={reverse} />;
          })}
        </div>
      );
    } else return null; //TODO
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    ready: state.eventView.ready,
    dates: state.eventView.dates,
    currentEvent: state.eventView.currentEvent,
  };
};

export default connect(mapStateToProps, null)(EventColumn);
