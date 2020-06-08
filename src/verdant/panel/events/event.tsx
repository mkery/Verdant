import * as React from "react";
import { connect } from "react-redux";
import { verdantState } from "../../redux/index";
import { History } from "../../../lilgit/model/history";
import NotebookEventLabel from "./event-label";
import NotebookEventMap from "./event-map";
import { eventState } from "src/verdant/redux/events";

type NotebookEvent_Props = {
  date_id: number;
  event_id: number;
  events: eventState;
  history: History;
  openGhostBook: () => void;
};

const EVENT_ROW = "Verdant-events-row";
const EVENT_NOTEBOOK = "Verdant-events-notebook";
const EVENT_MAP = "Verdant-events-map";
const COL = "Verdant-events-column";

class NotebookEvent extends React.Component<NotebookEvent_Props> {
  render() {
    return (
      <div className={EVENT_ROW} onClick={this.props.openGhostBook}>
        <div className={`${COL} label`}>
          <NotebookEventLabel
            date_id={this.props.date_id}
            event_id={this.props.event_id}
          />
        </div>
        <div className={`${COL} map`}>
          <div className={EVENT_MAP}>
            <div className={EVENT_NOTEBOOK}>{`# ${this.props.events.notebook +
              1}`}</div>
            <NotebookEventMap
              checkpoints={this.props.events.events}
              history={this.props.history}
              />
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<NotebookEvent_Props>
) => {
  return {
    history: state.history,
    openGhostBook: () => state.openGhostBook(ownProps.events.notebook)
  };
};

export default connect(mapStateToProps)(NotebookEvent);
