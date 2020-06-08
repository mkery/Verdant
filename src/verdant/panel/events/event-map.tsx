import * as React from "react";
import {ChangeType, Checkpoint} from "../../../lilgit/model/checkpoint";
import {History} from "../../../lilgit/model/history";
import {verdantState} from "../../redux";
import {connect} from "react-redux";

interface EventMap_Props {
  checkpoints: Checkpoint[];
  history: History;
}

const EVENT_NOTEBOOK = "Verdant-events-notebook";
const CELL = "v-VerdantPanel-runCellMap-cell";
const CELL_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const CELL_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const CELL_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const CELL_SAME = "v-VerdantPanel-runCellMap-cell-same";

class NotebookEventMap extends React.Component<EventMap_Props> {
  showMap() {
    let checkpoints = this.props.checkpoints;
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

  render() {
    return <div className={EVENT_NOTEBOOK}>{this.showMap()}</div>;
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<EventMap_Props>
) => {
  return {
  };
};

export default connect(mapStateToProps)(NotebookEventMap);
