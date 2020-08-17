import * as React from "react";
import { connect } from "react-redux";
import NotebookEventLabel from "./event-label";
import NotebookEventMap from "./event-map";
import { eventState, verdantState } from "../../redux/";
import { NodeyNotebook } from "../../../lilgit/nodey";
import { Namer } from "../../../lilgit/sampler/";

/* CSS Constants */
const EVENT = "Verdant-events-event";
const EVENT_STAMP = `${EVENT}-stamp`;
const EVENT_ROW = `${EVENT}-row`;
const EVENT_ROW_INDEX = `${EVENT_ROW}-index`;
const EVENT_ROW_MAP = `${EVENT_ROW}-map`;

type NotebookEvent_Props = {
  date_id: number;
  event_id: number;
  events: eventState;
  notebook: NodeyNotebook;
  openGhostBook: () => void;
};

class NotebookEvent extends React.Component<NotebookEvent_Props> {
  render() {
    return (
      <div className={EVENT} onClick={this.props.openGhostBook}>
        <div className={EVENT_STAMP}>
          <NotebookEventLabel
            date_id={this.props.date_id}
            event_id={this.props.event_id}
          />
        </div>
        <div className={EVENT_ROW}>
          <div className={EVENT_ROW_INDEX}>
            {Namer.getNotebookVersionLabel(this.props.notebook)}
          </div>
          <div className={EVENT_ROW_MAP}>
            <NotebookEventMap checkpoints={this.props.events.events} />
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
  const notebook = state
    .getHistory()
    .store.getNotebook(ownProps.events.notebook);
  return {
    openGhostBook: () => state.openGhostBook(ownProps.events.notebook),
    notebook,
  };
};

export default connect(mapStateToProps)(NotebookEvent);
