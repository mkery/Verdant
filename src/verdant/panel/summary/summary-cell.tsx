import * as React from "react";
import { connect } from "react-redux";
import { verdantState, artifactState } from "../../redux/index";
import { History } from "../../../lilgit/model/history";
import { CellSampler } from "../../sampler/cell-sampler";

const CELL = "v-VerdantPanel-Summary-cell";
const CODE_VLABEL = "v-VerdantPanel-Summary-code-vLabel";
const OUT_VLABEL = "v-VerdantPanel-Summary-out-vLabel";
const CODE_VLABEL_BORDER = "v-VerdantPanel-Summary-code-vLabel-border";

type CellArtifact_Props = {
  history: History;
  artifact_id: number;
  cell: artifactState;
};

export class CellVersions extends React.Component<{
  version: number;
  outVersion?: number;
}> {
  render() {
    if (this.props.outVersion) {
      return (
        <div className={`${CELL} ver`}>
          <div className={CODE_VLABEL}>{this.props.version}</div>
          <div className={CODE_VLABEL_BORDER}></div>
          <div className={OUT_VLABEL}>{this.props.outVersion}</div>
        </div>
      );
    }
    return <div className={`${CELL} ver`}>{this.props.version}</div>;
  }
}

class Cell extends React.Component<CellArtifact_Props, { artifact: string }> {
  constructor(props: CellArtifact_Props) {
    super(props);
    this.state = { artifact: "" };
  }

  componentDidMount() {
    this.fetchArtifact();
  }

  private async fetchArtifact() {
    let cell = this.props.history.notebook.cells[this.props.artifact_id];
    let model = cell.lastSavedModel;
    let sample = await CellSampler.sampleCell(this.props.history, model);
    this.setState({ artifact: sample.outerHTML });
  }

  render() {
    return (
      <div
        className={CELL}
        dangerouslySetInnerHTML={{ __html: this.state.artifact }}
      ></div>
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<CellArtifact_Props>
) => {
  return {
    history: state.getHistory(),
    cell: state.cellArtifacts[ownProps.artifact_id],
  };
};

export const CellArtifact = connect(mapStateToProps)(Cell);
