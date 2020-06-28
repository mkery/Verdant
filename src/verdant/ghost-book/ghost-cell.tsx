import * as React from "react";
import {History} from "../../lilgit/model/history";
import {NodeyCode} from "../../lilgit/model/nodey";
import {CELL_TYPE, SAMPLE_TYPE, Sampler} from "../../lilgit/model/sampler";
import {VersionSampler} from "../sampler/version-sampler";
import GhostCellLabel from "./ghost-cell-label";
import GhostCellOutput from "./ghost-cell-output";
import {connect} from "react-redux";
import {verdantState} from "../redux/index";
import {focusCell} from "../redux/ghost";
import {Checkpoint} from "../../lilgit/model/checkpoint";

/* CSS Constants */
const CONTAINER = "v-Verdant-GhostBook-container";
const CONTAINER_STACK = `${CONTAINER}-stack`;

const CELL = "v-Verdant-GhostBook-cell";
const CELL_BAND = `${CELL}-band`;
const CELL_CONTAINER = `${CELL}-container`;
const CELL_CONTENT = `${CELL}-content`;

const CODE_CELL = "code";
const MARKDOWN_CELL = "markdown";

// Enum for types of cells


export type GhostCell_Props = {
  // The index of the cell
  id?: number;
  // Entire state history. Used for VersionSampler
  history?: History;
  // String id of the cell
  name: string;
  // Type of the cell
  type: CELL_TYPE;
  // Name of the prior cell to diff against in diffPresent case
  prior: string;
  // Whether to display diffs with present cells or prior version
  diffPresent?: boolean;
  // Index of the cell's output cell (for a code cell) in state.GhostCells
  output?: string;
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
      sample: "",
    }
  }

  render() {
    /* Render cell */

    // Asynchronously update innerHTML if change has occurred
    this.updateSample();

    let nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return null;
    }
    let active = this.props.hasFocus() ? "active" : "";

    const displayOutput: boolean =
      nodey instanceof NodeyCode && // is a code cell
      nodey.output && // code cell has associated output
      this.getVersion() > 0 // is not version 0 (brand new) code cell

    return (
      <div
        className={`${CONTAINER} ${active}`}
        onClick={() => this.props.clickEv()}
      >
        <div className={`${CELL_BAND} ${active}`}/>
        <div className={CONTAINER_STACK}>
          <div className={CELL_CONTAINER}>
            <GhostCellLabel name={this.props.name} events={this.props.events}/>
            <div className={`${CELL_CONTENT} ${active}`}>
              <div
                className={`${CELL} ${this.cellTypeCSS()}  ${active}`}
                dangerouslySetInnerHTML={{__html: this.state.sample}}
              />
            </div>
          </div>
          {displayOutput ?
            <GhostCellOutput
              name={this.props.output}
              codeCell={this.props.name}
            /> : null}
        </div>
      </div>
    );
  }

  private async updateSample() {
    /* Update the sample HTML if it has changed */
    let newSample = await this.getSample();
    if (newSample.outerHTML != this.state.sample)
      this.setState({sample: newSample.outerHTML});
  }

  private async getSample() {
    /* Get the new sample HTML */
    let nodey = this.props.history.store.get(this.props.name);
    if (!nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return;
    }
    let diff;
    if (this.props.diffPresent) {
      diff = Sampler.PRESENT_DIFF;
    } else if (this.props.events === undefined) {
      diff = Sampler.NO_DIFF;
    } else if (this.props.events.length === 0) { // optimizing case
      diff = Sampler.NO_DIFF;
    } else {
      diff = Sampler.CHANGE_DIFF;
    }
    return VersionSampler.sample(
      SAMPLE_TYPE.DIFF,
      this.props.history,
      nodey,
      null,
      diff,
      this.props.prior
    );
  }

  private cellTypeCSS(): string {
    /* Returns the CSS class for the cell type */
    switch (this.props.type) {
      case CELL_TYPE.CODE:
        return CODE_CELL;
      case CELL_TYPE.MARKDOWN:
        return MARKDOWN_CELL;
      case CELL_TYPE.OUTPUT:
        console.log("Error: shouldn't render output cell in main cell");
        return "";
    }
  }

  private getVersion(): number {
    /* Returns the version of a cell */
    const lastChar = this.props.name.charAt(this.props.name.length - 1)
    return parseInt(lastChar, 10);
  }
}

const mapStateToProps = (state: verdantState, ownProps: GhostCell_Props) => {
  return {
    history: state.getHistory(),
    diffPresent: state.diffPresent,
    hasFocus: () => state.active_cell === ownProps.name
  };
};

const mapDispatchToProps = (dispatch: any, ownProps: GhostCell_Props) => {
  return {
    clickEv: () => dispatch(focusCell(ownProps.name)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCell);
