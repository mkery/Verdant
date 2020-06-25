import * as React from "react";
import { ChangeType, Checkpoint } from "../../../lilgit/model/checkpoint/";
import { History } from "../../../lilgit/model/history";
import { verdantState } from "../../redux";
import { connect } from "react-redux";

interface EventMap_Props {
  checkpoints: Checkpoint[];
  history: History;
}

const MAP = "Verdant-events-map";
const MAP_CELL = `${MAP}-cell`;
const MAP_CELL_ADDED = `${MAP_CELL}-added`;
const MAP_CELL_CHANGED = `${MAP_CELL}-changed`;
const MAP_CELL_REMOVED = `${MAP_CELL}-removed`;
const MAP_CELL_SAME = `${MAP_CELL}-same`;

class NotebookEventMap extends React.Component<EventMap_Props> {
  showMap() {
    let checkpoints = this.props.checkpoints;
    let cellMap = this.props.history.checkpoints.getCellMap(checkpoints);
    return cellMap.map((cell, index) => {
      let classes = `${MAP_CELL}`;
      let kind = cell.changeType;
      switch (kind) {
        case ChangeType.ADDED:
          classes = `${MAP_CELL} target ${MAP_CELL_ADDED}`;
          break;
        case ChangeType.CHANGED:
          classes = `${MAP_CELL} target ${MAP_CELL_CHANGED}`;
          break;
        case ChangeType.REMOVED:
          classes = `${MAP_CELL} target ${MAP_CELL_REMOVED}`;
          break;
        case ChangeType.SAME:
          classes = `${MAP_CELL} target ${MAP_CELL_SAME}`;
          break;
      }
      return <div key={index} className={classes}></div>;
    });
  }

  render() {
    return <div className={MAP}>{this.showMap()}</div>;
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<EventMap_Props>
) => {
  return {
    history: state.getHistory(),
  };
};

export default connect(mapStateToProps)(NotebookEventMap);
