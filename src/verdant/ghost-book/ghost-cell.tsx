import * as React from "react";
import { History } from "../../lilgit/history/";
import { NodeyCode, Nodey, NodeyOutput } from "../../lilgit/nodey/";
import { DIFF_TYPE, Namer } from "../../lilgit/sampler/";
import GhostCellOutput from "./ghost-cell-output";
import { connect } from "react-redux";
import { verdantState, focusGhostCell, showDetailOfNode } from "../redux/";
import { ChangeType } from "../../lilgit/checkpoint/";

/* CSS Constants */
const CONTAINER = "v-Verdant-GhostBook-container";
const CONTAINER_STACK = `${CONTAINER}-stack`;

const CELL = "v-Verdant-GhostBook-cell";
const CELL_BAND = `${CELL}-band`;
const CELL_CONTAINER = `${CELL}-container`;
const CELL_CONTENT = `${CELL}-content`;

// Enum for types of cells
export type req_GhostCell_Props = {
  // String id of the cell
  name: string;
  scrollTo?: () => void;
};
export type GhostCell_Props = {
  // Entire state history. Used for VersionSampler
  history: History;
  // Whether to display diffs with present cells or prior version
  diff: DIFF_TYPE;
  output: NodeyOutput | undefined;
  nodey: Nodey;
  // On-click action
  clickEv: () => void;
  // On-focus action
  hasFocus: () => boolean;
  // open up detail of nodey
  showDetail: (n: Nodey) => void;
  //scroll
  scrollFocus: string;
  inspectOn: boolean;
  notebookVer: number;
} & req_GhostCell_Props;

type GhostCell_State = {
  sample: string;
  change: ChangeType;
};

class GhostCell extends React.Component<GhostCell_Props, GhostCell_State> {
  constructor(props) {
    /* Explicit constructor to initialize state */
    // Required super call
    super(props);
    // Set state
    this.state = {
      sample: "",
      change: ChangeType.NONE,
    };
  }

  componentDidMount() {
    // load in the content and diff for this cell
    this.updateSample();
  }

  componentDidUpdate(prevProps: GhostCell_Props) {
    if (
      this.props.scrollTo &&
      prevProps.scrollFocus != this.props.scrollFocus &&
      this.props.scrollFocus === this.props.name
    ) {
      setTimeout(() => this.props.scrollTo(), 1000);
    }
    if (
      this.props.notebookVer !== prevProps.notebookVer ||
      this.props.diff !== prevProps.diff
    )
      this.updateSample();
  }

  render() {
    /* Render cell */

    if (!this.props.nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return null;
    }
    const active = this.props.hasFocus() ? "active" : "";
    const displayOutput: boolean = this.props.output !== undefined; // is a code cell & has associated output

    return (
      <div
        className={`${CONTAINER} ${active} ${this.state.change}`}
        onClick={() => this.props.clickEv()}
      >
        <div className={CONTAINER_STACK}>
          <div
            className="v-Verdant-GhostBook-cell-label"
            onClick={() => this.props.showDetail(this.props.nodey)}
          >
            {Namer.getCellVersionTitle(this.props.nodey)}
          </div>
          <div
            className={`${CELL_CONTAINER}${
              this.props.inspectOn ? " hoverInspect" : ""
            }`}
            onClick={() => {
              if (this.props.inspectOn) this.props.showDetail(this.props.nodey);
            }}
          >
            <div className="v-Verdant-GhostBook-cell-header" />
            <div className={`${CELL_BAND} ${active}`} />
            <div className={`${CELL_CONTENT} ${active}`}>
              <div
                className={`${CELL} ${
                  this.props.nodey.typeChar === "c" ? "code" : "markdown"
                }  ${active}`}
                dangerouslySetInnerHTML={{ __html: this.state.sample }}
              />
            </div>
          </div>
          {displayOutput ? (
            <GhostCellOutput
              nodey={this.props.output}
              changed={this.state.change === ChangeType.OUTPUT_CHANGED}
            />
          ) : null}
        </div>
      </div>
    );
  }

  /*private getChangeStatus(){
    let status = await this.props.history.inspector.getCellStatus()
  }*/

  private async updateSample() {
    /* Update the sample HTML if it has changed */
    let newSample = await this.getSample();
    if (newSample && newSample.outerHTML != this.state.sample)
      this.setState({ sample: newSample.outerHTML });
  }

  private async getSample() {
    /* Get the new sample HTML */
    if (!this.props.nodey) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.name);
      return;
    }
    let diff = this.props.diff;
    if (diff === DIFF_TYPE.CHANGE_DIFF) {
      if (this.state.change === ChangeType.OUTPUT_CHANGED) {
        diff = DIFF_TYPE.NO_DIFF;
      }
    }

    let notebook = this.props.notebookVer;
    if (diff === DIFF_TYPE.PRESENT_DIFF)
      notebook = this.props.history.store.currentNotebook.version;

    return this.props.history.inspector.renderDiff(
      this.props.nodey,
      diff,
      notebook
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: req_GhostCell_Props
) => {
  const history = state.getHistory();
  const nodey = history?.store?.get(ownProps.name);
  const outputHist =
    nodey instanceof NodeyCode ? history?.store?.getOutput(nodey) : null;
  const notebookVer = state.ghostBook.notebook_ver;
  const output = history?.store?.getForNotebook(outputHist, notebookVer);

  return {
    history,
    output,
    nodey,
    diff: state.ghostBook.diff,
    hasFocus: () => state.ghostBook.active_cell === ownProps.name,
    scrollFocus: state.ghostBook.scroll_focus,
    inspectOn: state.artifactView.inspectOn,
    notebookVer,
  };
};

const mapDispatchToProps = (dispatch: any, ownProps: req_GhostCell_Props) => {
  return {
    clickEv: () =>
      ownProps.name ? dispatch(focusGhostCell(ownProps.name)) : null,
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCell);
