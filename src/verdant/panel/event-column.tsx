import * as React from "react";
import { History } from "../../lilgit/history/";
import { Checkpoint } from "../../lilgit/checkpoint";
import NotebookEventDate from "./events/event-date";
import { connect } from "react-redux";
import { verdantState, initEventMap, dateState } from "../redux/";

const PANEL = "v-VerdantPanel-content";

type EventColumn_Props = {
  history: History;
  currentEvent: Checkpoint;
  initEventMap: () => void;
  dates: dateState[];
};

class EventColumn extends React.Component<EventColumn_Props> {
  componentDidMount() {
    this.props.history.ready.then(async () => {
      await this.props.history.notebook.ready;
      this.props.initEventMap();
    });
  }

  render() {
    return (
      <div className={PANEL}>
        {this.props.dates.map((_, index) => {
          let reverse = this.props.dates.length - 1 - index;
          return <NotebookEventDate key={reverse} date_id={reverse} />;
        })}
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    initEventMap: () => dispatch(initEventMap()),
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    dates: state.dates,
    currentEvent: state.currentEvent,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(EventColumn);
