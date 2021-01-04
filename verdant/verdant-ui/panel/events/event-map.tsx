import * as React from "react";
import { ChangeType, Checkpoint } from "../../../verdant-model/checkpoint";
import { CellMap, Namer } from "../../../verdant-model/sampler";
import { History } from "../../../verdant-model/history";
import { Nodey, NodeyCodeCell } from "../../../verdant-model/nodey";
import { verdantState, showDetailOfNode } from "../../redux/";
import ReactTooltip from "react-tooltip";
import { connect } from "react-redux";

type react_EventMap_Props = {
  checkpoints: Checkpoint[];
};

type EventMap_Props = {
  // given by redux store
  history: History;
  eventCount: number;
  showDetail: (n: Nodey) => void;
} & react_EventMap_Props;

const MAP = "Verdant-events-map";

class NotebookEventMap extends React.Component<
  EventMap_Props,
  { cellMap: CellMap.map }
> {
  private _isMounted;

  constructor(props) {
    super(props);
    let checkpoints = this.props.checkpoints;
    let cellMap = CellMap.build(checkpoints, this.props.history);
    this.state = {
      cellMap,
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(oldProps) {
    if (this._isMounted && oldProps.eventCount !== this.props.eventCount) {
      let checkpoints = this.props.checkpoints;
      let cellMap = CellMap.build(checkpoints, this.props.history);
      this.setState({ cellMap });
    }
  }

  showMap() {
    return this.state.cellMap.map((cell, index) => {
      if (cell.changes.length > 0) {
        let tics: JSX.Element[] = [];
        cell.changes.forEach((kind, j_index) => {
          let color = kind.replace(/ /g, "_");
          tics.push(<div key={j_index} className={`tic ${color}`}></div>);
        });
        let nodey = this.props.history.store.get(cell.name);
        let tooltip_msg = Namer.describeChange(nodey, cell.changes);
        return (
          <div
            data-tip={tooltip_msg}
            key={index}
            className="Verdant-events-map-cell target"
            onClick={() => {
              if (nodey) {
                if (cell.changes[0] === ChangeType.OUTPUT_CHANGED) {
                  let out = this.props.history.store.getOutput(
                    nodey as NodeyCodeCell
                  )?.latest;
                  if (out) this.props.showDetail(out);
                } else this.props.showDetail(nodey);
              }
            }}
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
  ownProps: react_EventMap_Props
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
