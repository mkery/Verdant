import * as React from "react";
import {
  CellRunData,
  ChangeType,
  Checkpoint,
} from "../../../lilgit/checkpoint";
import { History } from "../../../lilgit/history/";
import { verdantState } from "../../redux/";
import { connect } from "react-redux";

interface EventMap_Props {
  checkpoints: Checkpoint[];
  history: History;
  eventCount: number;
}

const MAP = "Verdant-events-map";
const MAP_CELL = `${MAP}-cell`;
const MAP_CELL_ADDED = `${MAP_CELL}-added`;
const MAP_CELL_CHANGED = `${MAP_CELL}-changed`;
const MAP_CELL_REMOVED = `${MAP_CELL}-removed`;
const MAP_CELL_SAME = `${MAP_CELL}-same`;

class NotebookEventMap extends React.Component<
  EventMap_Props,
  { cellMap: CellRunData[] }
> {
  constructor(props) {
    super(props);
    let checkpoints = this.props.checkpoints;
    let cellMap = this.props.history.checkpoints.getCellMap(checkpoints);
    this.state = {
      cellMap,
    };
  }

  componentDidUpdate(oldProps) {
    if (oldProps.eventCount !== this.props.eventCount) {
      let checkpoints = this.props.checkpoints;
      let cellMap = this.props.history.checkpoints.getCellMap(checkpoints);
      this.setState({ cellMap });
    }
  }

  showMap() {
    return this.state.cellMap.map((cell, index) => {
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
    eventCount: ownProps.checkpoints.length,
  };
};

export default connect(mapStateToProps)(NotebookEventMap);
