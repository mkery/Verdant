import * as React from "react";
import { Namer, DIFF_TYPE } from "../../verdant-model/sampler";
import { History } from "../../verdant-model/history";
import {
  NodeyOutput,
  Nodey,
  NodeyCell,
  NodeyCodeCell,
} from "../../verdant-model/nodey";
import { connect } from "react-redux";
import { verdantState, showDetailOfNode } from "../redux/";

type GhostCellOutput_Props = {
  // Entire state history. Used for VersionSampler
  history: History;
  // open up detail of nodey
  showDetail: (n: Nodey) => void;
  inspectOn: boolean;
  changed: boolean;
  cell: NodeyCell;
  output: NodeyOutput;
  notebookVer: number;
  diff: DIFF_TYPE;
};

type GhostCellOutput_State = {
  sample: string;
};

class GhostCellOutput extends React.Component<
  GhostCellOutput_Props,
  GhostCellOutput_State
> {
  private _isMounted;

  /*
   * Component to render output of a code ghost cell.
   * */
  constructor(props) {
    /* Explicit constructor to initialize state */
    // Required super call
    super(props);
    // Set state
    this.state = {
      sample: "",
    };
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;

    if (this.props.output && this.state.sample === "") this.updateSample();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(priorProps: GhostCellOutput_Props) {
    if (this._isMounted)
      if (
        this.props.output?.name !== priorProps.output?.name ||
        this.props.diff !== priorProps.diff
      ) {
        this.setState({ sample: "" });
        this.updateSample();
      }
  }

  render() {
    /* Render cell output */
    let output = this.props.output;
    if (!output) return null;

    return (
      <div
        className={`v-Verdant-GhostBook-cell-container output${
          this.props.inspectOn ? " hoverInspect" : ""
        }${this.props.changed ? " changed" : ""}`}
        onClick={() => {
          if (this.props.inspectOn) this.props.showDetail(output);
        }}
      >
        <div
          className="v-Verdant-GhostBook-cell-label"
          onClick={() => this.props.showDetail(output)}
        >
          {Namer.getOutputVersionTitle(output, this.props.history)}
        </div>{" "}
        <div className="v-Verdant-GhostBook-cell-header" />
        <div className="v-Verdant-GhostBook-cell-content">
          <div className="v-Verdant-GhostBook-cell">
            <div dangerouslySetInnerHTML={{ __html: this.state.sample }} />
          </div>
        </div>
      </div>
    );
  }

  private async updateSample() {
    /* Update the sample HTML if it has changed */
    let newSample = await this.getSample();

    if (newSample && this._isMounted)
      this.setState({ sample: newSample.outerHTML });
  }

  private async getSample() {
    let output = this.props.output;
    if (output && output?.raw?.length > 0) {
      let notebook = this.props.notebookVer;
      if (this.props.diff === DIFF_TYPE.PRESENT_DIFF)
        notebook = this.props.history.store.currentNotebook.version;

      let sample = await this.props.history.inspector.diff.renderCell(
        output,
        this.props.diff,
        notebook
      );

      return sample;
    }
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<GhostCellOutput_Props>
) => {
  const diff = state.ghostBook.diff;
  const history = state.getHistory();
  const notebookVer = state.ghostBook.notebook_ver;
  const outputHistory =
    ownProps.cell instanceof NodeyCodeCell
      ? history?.store?.getOutput(ownProps.cell)
      : null;
  let output = history?.store?.getForNotebook(outputHistory, notebookVer);

  // special case for comparing to the present if there was no output in the past
  if (!output && diff === DIFF_TYPE.PRESENT_DIFF)
    output = outputHistory?.latest;

  return {
    diff,
    history,
    inspectOn: state.artifactView.inspectOn,
    notebookVer,
    output,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCellOutput);
