import * as React from "react";
import {History} from "../../lilgit/model/history";
import {NodeyCode} from "../../lilgit/model/nodey";
import {Sampler} from "../../lilgit/model/sampler";
import {VersionSampler} from "../sampler/version-sampler";
import GhostCellLabel from "./ghost-cell-label";
import GhostCellOutput from "./ghost-cell-output";
import {connect} from "react-redux";
import {verdantState} from "../redux/index";
import {focusCell} from "../redux/ghost";
import {Checkpoint} from "../../lilgit/model/checkpoint";

export type GhostCell_Props = {
  // Index of the cell in state.GhostCells
  id: number;
  // Entire state history. Used for VersionSampler
  history?: History;
  // String id of the cell
  name?: string;
  // Index of the cell's output cell (for a code cell) in state.GhostCells
  output?: number;
  // Checkpoints associated with the cell
  events?: Checkpoint[];

  // On-click action
  clickEv?: () => void;
  // On-focus action
  hasFocus?: () => boolean;
}

type GhostCell_State = {
  sample: string;
}

class GhostCell extends React.Component<GhostCell_Props, GhostCell_State> {
  constructor(props) {
    /* Explicit constructor to initialize state */
    // Required super call
    super(props);
    // Set state
    this.state = {
      sample: ""
    }
  }

  async componentDidMount() {
    /* If the component is rendered, generate body HTML */
    await this.getSample();
  }

  render() {
    /* Render cell */
    let nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.error("ERROR: CAN'T FIND GHOST CELL", this.props.name);
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
            <GhostCellLabel name={this.props.name} events={this.props.events}/>
            <div className={`v-Verdant-GhostBook-cell-content ${active}`}>
              <div
                className={`v-Verdant-GhostBook-cell 
                ${this.props.name.charAt(0)}  ${active}`}
                dangerouslySetInnerHTML={{__html: this.state.sample}}
              />
            </div>
          </div>
          {nodey instanceof NodeyCode && nodey.output ?
            <GhostCellOutput id={this.props.output}/> : null}
        </div>
      </div>
    );
  }

  private async getSample() {
    let nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.error("ERROR: CAN'T FIND GHOST CELL", this.props.name);
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
}

const mapStateToProps = (state: verdantState, ownProps: GhostCell_Props) => {
  let cell = state.ghostCells[ownProps.id];
  return {
    history: state.getHistory(),
    hasFocus: () => state.active_cell === cell.name,
    name: cell.name,
    output: cell.output,
    events: cell.events
  };
};

const mapDispatchToProps = (dispatch: any, ownProps: GhostCell_Props) => {
  return {
    clickEv: () => dispatch(focusCell(ownProps.id)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCell);
