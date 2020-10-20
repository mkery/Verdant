import * as React from "react";
import { Checkpoint } from "../../../lilgit/checkpoint";
import { CellMap, Namer } from "../../../lilgit/sampler";
import { History } from "../../../lilgit/history/";
import { Nodey } from "../../../lilgit/nodey";
import { verdantState, showDetailOfNode } from "../../redux/";
import ReactTooltip from "react-tooltip";
import { connect } from "react-redux";

interface EventMap_Props {
  checkpoints: Checkpoint[];
  history: History;
  eventCount: number;
  showDetail: (n: Nodey) => void;
}

const MAP = "Verdant-events-map";

class NotebookEventMap extends React.Component<
  EventMap_Props,
  { cellMap: CellMap.map }
> {
  constructor(props) {
    super(props);
    let checkpoints = this.props.checkpoints;
    let cellMap = CellMap.build(checkpoints, this.props.history);
    this.state = {
      cellMap,
    };
  }

  componentDidUpdate(oldProps) {
    if (oldProps.eventCount !== this.props.eventCount) {
      let checkpoints = this.props.checkpoints;
      let cellMap = CellMap.build(checkpoints, this.props.history);
      this.setState({ cellMap });
    }
  }

  showMap() {
    return this.state.cellMap.map((cell, index) => {
      if (cell.changes.length > 0) {
        let tics = [];
        cell.changes.forEach((kind, j_index) => {
          let color = kind.replace(/ /g, "_");
          tics.push(<div key={j_index} className={`tic ${color}`}></div>);
        });
        let nodey = this.props.history.store.get(cell.name);
        let tooltip_msg = `${Namer.getCellVersionTitle(
          nodey
        )} was ${cell.changes.join(", ")}`;
        return (
          <div
            data-tip={tooltip_msg}
            key={index}
            className="Verdant-events-map-cell target"
            onClick={() => this.props.showDetail(nodey)}
          >
            {tics}
            <ReactTooltip />
          </div>
        );
      } else return <div key={index} className="Verdant-events-map-cell"></div>;
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

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NotebookEventMap);
