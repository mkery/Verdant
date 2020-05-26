import * as React from "react";
import { History } from "../../../lilgit/model/history";
import { Nodey } from "../../../lilgit/model/nodey";
import { CellVersions, CellArtifact } from "./summary-cell";
import { connect } from "react-redux";
import {
  verdantState,
  inspectNode,
  switchTab,
  ActiveTab,
  artifactState
} from "../../redux/index";

const CELL = "v-VerdantPanel-Summary-cell";
const NOTEBOOK_ICON = "v-VerdantPanel-Summary-notebook-icon";
const NOTEBOOK_LABEL = "v-VerdantPanel-Summary-notebook-label";
const NOTEBOOK_TITLE = "v-VerdantPanel-Summary-notebook-title";

export type Summary_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  cells: artifactState[];
  notebook: artifactState;
  artifact_count: number;
};

class Summary extends React.Component<Summary_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-content">
        <div className="v-VerdantPanel-Summary-header">
          <div className="v-VerdantPanel-Summary-header-aLabel">artifact</div>
          <div className="v-VerdantPanel-Summary-header-vLabel">versions</div>
        </div>
        <div className="v-VerdantPanel-Summary">
          <div className="v-VerdantPanel-Summary-column artifactCol">
            {this.showNotebookArtifact()}
            {this.showCellArtifacts()}
          </div>
          <div className="v-VerdantPanel-Summary-column versionCol">
            {this.showNotebookVersion()}
            {this.showCellVersions()}
          </div>
        </div>
      </div>
    );
  }

  private showNotebookArtifact() {
    if (this.props.notebook)
      return (
        <div className={CELL}>
          <div className={NOTEBOOK_LABEL}>
            <div className={`${NOTEBOOK_ICON} jp-NotebookIcon`} />
            <div className={NOTEBOOK_TITLE}>{this.props.notebook.file}</div>
          </div>
        </div>
      );
    return null;
  }

  private showCellArtifacts() {
    return this.props.cells.map((c: artifactState, index: number) => {
      let ev = () =>
        this.props.showDetails(this.props.history.store.get(c.name));
      return (
        <div onClick={ev} key={c.name + "a" + index}>
          <CellArtifact artifact_id={index} />
        </div>
      );
    });
  }

  private showNotebookVersion() {
    if (this.props.notebook)
      return <CellVersions version={this.props.notebook.ver} />;
    return null;
  }

  private showCellVersions() {
    return this.props.cells.map((c: artifactState, index: number) => {
      let ev = () =>
        this.props.showDetails(this.props.history.store.get(c.name));
      return (
        <div onClick={ev} key={c.name + "v" + index}>
          <CellVersions version={c.ver} outVersion={c.outputVer} />
        </div>
      );
    });
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(inspectNode(n));
      dispatch(switchTab(ActiveTab.Artifact_Details));
    }
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.history,
    cells: state.cellArtifacts,
    notebook: state.notebookArtifact,
    artifact_count: state.cellArtifacts.length
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Summary);
