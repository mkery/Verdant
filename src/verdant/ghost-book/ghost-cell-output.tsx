import * as React from "react";
import { Namer, DIFF_TYPE } from "../../lilgit/sampler";
import { History } from "../../lilgit/history";
import { NodeyOutput, Nodey } from "../../lilgit/nodey";
import { connect } from "react-redux";
import { verdantState, showDetailOfNode } from "../redux/";

type GhostCellOutput_Props = {
  // Entire state history. Used for VersionSampler
  history: History;
  // open up detail of nodey
  showDetail: (n: Nodey) => void;
  inspectOn: boolean;
  changed: boolean;
  nodey: NodeyOutput;
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
  }

  componentDidMount() {
    this.updateSample();
  }

  componentDidUpdate(priorProps: GhostCellOutput_Props) {
    if (
      this.props.notebookVer !== priorProps.notebookVer ||
      this.props.diff !== priorProps.diff
    )
      this.updateSample();
  }

  render() {
    /* Render cell output */
    let output = this.props.nodey;

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
    if (newSample && newSample.outerHTML != this.state.sample)
      this.setState({ sample: newSample.outerHTML });
  }

  private async getSample() {
    let output = this.props.nodey;
    if (output.raw.length > 0) {
      let notebook = this.props.notebookVer;
      if (this.props.diff === DIFF_TYPE.PRESENT_DIFF)
        notebook = this.props.history.store.currentNotebook.version;

      return this.props.history.inspector.renderDiff(
        output,
        this.props.diff,
        notebook
      );
    }
  }
}

const mapStateToProps = (state: verdantState) => {
  const history = state.getHistory();
  const notebookVer = state.ghostBook.notebook_ver;
  return {
    diff: state.ghostBook.diff,
    history,
    inspectOn: state.artifactView.inspectOn,
    notebookVer,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCellOutput);
