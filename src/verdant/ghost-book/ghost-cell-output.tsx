import * as React from "react";
import { Sampler } from "../../lilgit/model/sampler";
import { VersionSampler } from "../sampler/version-sampler";
import { History } from "../../lilgit/model/history";
import { NodeyOutput } from "../../lilgit/model/nodey";
import GhostCellLabel from "./ghost-cell-label";
import { connect } from "react-redux";
import { verdantState } from "../redux/index";

type GhostCellOutput_Props = {
  // String id of the output cell
  name: string;
  // Entire state history. Used for VersionSampler
  history?: History;
}

type GhostCellOutput_State = {
  sample: string;
}

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
      sample: ""
    }
  }

  async componentDidMount() {
    /* If the component is rendered, generate body HTML */
    await this.getSample();
  }

  render() {
    /* Render cell output */
    return (
      <div className="v-Verdant-GhostBook-cell-container">
        <GhostCellLabel name={this.props.name} />
        <div className="v-Verdant-GhostBook-cell-content">
          <div className="v-Verdant-GhostBook-cell">
            <div dangerouslySetInnerHTML={{ __html: this.state.sample }} />
          </div>
        </div>
      </div>
    );
  }

  async getSample() {
    // Get output HTML
    let output = this.props.history.store.get(this.props.name) as NodeyOutput;
    if (output.raw.length > 0) {
      // Attach diffs to output
      let outSample = await VersionSampler.sample(
        this.props.history,
        output,
        null,
        // Never show diffing for output cells TODO: Add diffing?
        Sampler.NO_DIFF
      );
      this.setState({ sample: outSample.outerHTML });
    }
  }
}

const mapStateToProps = (
  state: verdantState
) => {
  return {
    history: state.getHistory()
  };
};

export default connect(mapStateToProps)(GhostCellOutput);
