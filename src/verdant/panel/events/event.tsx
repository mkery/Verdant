import * as React from "react";
import { connect } from "react-redux";
import NotebookEventLabel from "./event-label";
import NotebookEventMap from "./event-map";
import { eventState, verdantState } from "../../redux/";
import { NodeyNotebook } from "../../../lilgit/nodey";
import { Namer } from "../../../lilgit/sampler/";

type NotebookEvent_Props = {
  date_id: number;
  event_id: number;
  events: eventState;
  notebook: NodeyNotebook;
  openGhostBook: () => void;
  currentGhostBook: () => boolean;
};

class NotebookEvent extends React.Component<NotebookEvent_Props> {
  render() {
    const ghostOpen = this.props.currentGhostBook();
    return (
      <div className={`Verdant-events-event${ghostOpen ? " ghostOpen" : ""}`}>
        <div className="Verdant-events-event-stamp">
          <NotebookEventLabel
            date_id={this.props.date_id}
            event_id={this.props.event_id}
          />
        </div>
        <div
          className="Verdant-events-event-row-index verdant-link"
          onClick={this.props.openGhostBook}
        >
          {Namer.getNotebookVersionLabel(this.props.notebook)}
        </div>
        <div className="Verdant-events-event-row-map">
          <NotebookEventMap checkpoints={this.props.events.events} />
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
    currentGhostBook: () => notebook.version === state.ghostBook.notebook_ver,
  };
};

export default connect(mapStateToProps)(NotebookEvent);
