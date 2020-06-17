import * as React from "react";
import {History} from "../../lilgit/model/history";
import {Nodey, NodeyCode} from "../../lilgit/model/nodey";
import {Sampler} from "../../lilgit/model/sampler";
import {VersionSampler} from "../sampler/version-sampler";
import GhostCellLabel from "./ghost-cell-label";
import GhostCellOutput from "./ghost-cell-output";
import {connect} from "react-redux";
import {verdantState} from "../redux/index";
import {focusCell, ghostCellState} from "../redux/ghost";

type GhostCell_Events = {
  linkArtifact: (name: string) => void;
  clickEv: () => void;
  hasFocus: () => boolean;
  setSample: (s: string) => void;
};

export type GhostCell_Props = {
  id: number;
  history?: History; // loaded via redux
} & Partial<ghostCellState> & // loaded via redux
  Partial<GhostCell_Events>; // loaded via redux

class Cell extends React.Component<GhostCell_Props, { sample: string }> {
  constructor(props: GhostCell_Props) {
    super(props);
    this.state = {sample: ""};
  }

  componentDidMount() {
    this.getSample(); // render the source code
  }

  render() {
    let nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return null;
    }
    let active = this.props.hasFocus() ? "active" : "";

    return (
      <div
        className={`v-Verdant-GhostBook-container ${active}`}
        onClick={() => this.props.clickEv()}
      >
        <div className={`v-Verdant-GhostBook-cell-band ${active}`}/>
        <div className="v-Verdant-GhostBook-container-stack">
          <div className="v-Verdant-GhostBook-cell-container">
            <GhostCellLabel name={this.props.name} events={this.props.events} />
            <div className={`v-Verdant-GhostBook-cell-content ${active}`}>
              <div
                className={`v-Verdant-GhostBook-cell 
                ${this.props.name.charAt(0)}  ${active}`}
                dangerouslySetInnerHTML={{__html: this.state.sample}}
              ></div>
            </div>
          </div>
          {this.showOutput(nodey)}
        </div>
      </div>
    );
  }

  private async getSample() {
    let nodey = this.props.history.store.get(this.props.name);
    console.log("Rendering Ghost Cell ", this.props.name);
    if (!nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
    } else {
      let diff;
      if (this.props.events === undefined || this.props.events.length === 0) {
        diff = Sampler.NO_DIFF;
      } else {
        diff = Sampler.CHANGE_DIFF;
      }
      let sample = await VersionSampler.sample(
        this.props.history,
        nodey,
        null,
        diff
      );
      this.setState({sample: sample.outerHTML});
    }
  }

  private showOutput(nodey: Nodey) {
    if (nodey instanceof NodeyCode && nodey.output)
      return <GhostCellOutput id={this.props.output}/>;
    return null;
  }
}

const mapStateToProps = (state: verdantState, ownProps: GhostCell_Props) => {
  let cell = state.ghostCells[ownProps.id];
  return {
    ...ownProps,
    history: state.getHistory(),
    hasFocus: () => state.active_cell === cell.name,
    linkArtifact: state.link_artifact,
    ...cell,

  };
};

const mapDispatchToProps = (dispatch: any, ownProps: GhostCell_Props) => {
  return {
    clickEv: () => dispatch(focusCell(ownProps.id)),
  };
};

const GhostCell = connect(mapStateToProps, mapDispatchToProps)(Cell);

export default GhostCell;
