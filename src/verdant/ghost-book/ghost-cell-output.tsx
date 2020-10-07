import * as React from "react";
import { Sampler, SAMPLE_TYPE, Namer } from "../../lilgit/sampler";
import { VersionSampler } from "../sampler/version-sampler";
import { History } from "../../lilgit/history";
import { NodeyOutput, Nodey } from "../../lilgit/nodey";
import { connect } from "react-redux";
import { verdantState, showDetailOfNode } from "../redux/";

type GhostCellOutput_Props = {
  // Parent code cell id
  codeCell: string;
  // String id of the output cell
  name: string;
  // Entire state history. Used for VersionSampler
  history?: History;
  // open up detail of nodey
  showDetail: (n: Nodey) => void;
  inspectOn: boolean;
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

  render() {
    /* Render cell output */

    // Conditionally update HTML
    this.updateSample();

    // If output is empty, return nothing
    if (this.state.sample.length === 0) return null;

    let output = this.props.history.store.get(this.props.name) as NodeyOutput;

    return (
      <div
        className={`v-Verdant-GhostBook-cell-container output${
          this.props.inspectOn ? " hoverInspect" : ""
        }`}
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
    if (
      newSample === undefined && // sample is undefined and
      this.state.sample !== "" // sample has not been reset
    ) {
      // undefined samples are reset to blank
      this.setState({ sample: "" });
    } else if (
      newSample !== undefined && // sample is not undefined
      this.state.sample !== newSample.outerHTML // sample has not been updated
    ) {
      // new samples update state
      this.setState({ sample: newSample.outerHTML });
    }
  }

  async getSample() {
    // Get output HTML
    let output = this.props.history.store.get(this.props.name) as NodeyOutput;
    if (output.raw.length > 0) {
      // Attach diffs to output
      return VersionSampler.sample(
        SAMPLE_TYPE.DIFF,
        this.props.history,
        output,
        null,
        // Never attempt to show diffing for output cells
        Sampler.NO_DIFF
      );
    }
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    inspectOn: state.artifactView.inspectOn,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCellOutput);
