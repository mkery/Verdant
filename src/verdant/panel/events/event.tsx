import * as React from "react";
import { connect } from "react-redux";
import { verdantState } from "../../redux/index";
import { History } from "../../../lilgit/model/history";
import { ChangeType } from "../../../lilgit/model/checkpoint";
import NotebookEventLabel from "./event-label";
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
const CELL = "v-VerdantPanel-runCellMap-cell";
const CELL_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const CELL_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const CELL_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const CELL_SAME = "v-VerdantPanel-runCellMap-cell-same";
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
            <div className={EVENT_NOTEBOOK}>{this.showMap()}</div>
          </div>
        </div>
      </div>
    );
  }

  private showMap() {
    let checkpoints = this.props.events.events;
    let cellMap = this.props.history.checkpoints.getCellMap(checkpoints);
    return cellMap.map((cell, index) => {
      let classes = `${CELL}`;
      let kind = cell.changeType;
      switch (kind) {
        case ChangeType.ADDED:
          classes = `${CELL} target ${CELL_ADDED}`;
          break;
        case ChangeType.CHANGED:
          classes = `${CELL} target ${CELL_CHANGED}`;
          break;
        case ChangeType.REMOVED:
          classes = `${CELL} target ${CELL_REMOVED}`;
          break;
        case ChangeType.SAME:
          classes = `${CELL} target ${CELL_SAME}`;
          break;
      }
      return <div key={index} className={classes}></div>;
    });
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
