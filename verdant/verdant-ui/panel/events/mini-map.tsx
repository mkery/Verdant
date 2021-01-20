import * as React from "react";
import { CellRunData, ChangeType } from "../../../verdant-model/checkpoint";
import { Namer } from "../../../verdant-model/sampler";
import { History } from "../../../verdant-model/history";
import { Nodey } from "../../../verdant-model/nodey";
import { verdantState, showDetailOfNode } from "../../redux";
import ReactTooltip from "react-tooltip";
import { connect } from "react-redux";

type EventMap_Props = {
  targets: CellRunData[];
  notebook_ver: number;
  notebook_length: number;
  history: History;
  showDetail: (n: Nodey) => void;
};

class MiniMap extends React.Component<EventMap_Props> {
  render() {
    return <div className="Verdant-events-map">{this.showMap()}</div>;
  }

  showMap() {
    const tick_width = 3;
    let width = `${this.props.notebook_length * tick_width}px`;
    return (
      <div
        className="Verdant-events-map-background"
        style={{ width }}
        data-tip={`${this.props.notebook_length} cells in this notebook`}
      >
        {this.props.targets.map((dat, j_index) => {
          let left = `${dat.index * tick_width}px`;
          let color = dat.changeType.replace(/ /g, "_");

          let nodey = this.props.history.store.get(dat.cell);
          let tooltip_msg = Namer.describeChange(nodey, [dat.changeType]);
          return (
            <div
              className={`Verdant-events-map-cell target tic ${color}`}
              style={{ left }}
              data-tip={tooltip_msg}
              key={j_index}
              onClick={() => {
                const nodey = this.props.history.store?.get(dat?.cell);
                if (nodey) this.props.showDetail(nodey);
              }}
            ></div>
          );
        })}
        <ReactTooltip />
      </div>
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<EventMap_Props>
) => {
  const history = state.getHistory();
  const notebook = history?.store?.getNotebook(ownProps.notebook_ver);
  let notebook_length = notebook?.cells?.length || 0;
  ownProps.targets?.forEach((target) => {
    if (target.changeType === ChangeType.REMOVED) notebook_length++;
  });
  return {
    history: state.getHistory(),
    notebook_length,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(MiniMap);
