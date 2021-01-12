import * as React from "react";
import { ChangeType } from "../../../verdant-model/checkpoint";
import { CellMap, Namer } from "../../../verdant-model/sampler";
import { History } from "../../../verdant-model/history";
import { Nodey, NodeyCodeCell } from "../../../verdant-model/nodey";
import { verdantState, showDetailOfNode } from "../../redux";
import ReactTooltip from "react-tooltip";
import { connect } from "react-redux";

type EventMap_Props = {
  cellMap: CellMap.map;
  history: History;
  showDetail: (n: Nodey) => void;
};

const MAP = "Verdant-events-map";

class MiniMap extends React.Component<EventMap_Props> {
  showMap() {
    return this.props.cellMap.map((cell, index) => {
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

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(MiniMap);
