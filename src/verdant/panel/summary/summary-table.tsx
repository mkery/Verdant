import * as React from "react";
import { History } from "../../../lilgit/history";
import { Nodey } from "../../../lilgit/nodey";
import { connect } from "react-redux";
import {
  verdantState,
  inspectNode,
  switchTab,
  ActiveTab,
  artifactState,
} from "../../redux/index";
import { SummaryRow } from "./summary-row";

export type Summary_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  cells: artifactState[];
  notebook: artifactState;
  artifact_count: number;
};

class SummaryTable extends React.Component<Summary_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-content">
        {this.showHeader()}
        <div className="v-VerdantPanel-Summary-table">{this.showTable()}</div>
      </div>
    );
  }

  private showHeader() {
    return (
      <div className="v-VerdantPanel-Summary-header">
        <div className="v-VerdantPanel-Summary-header-label cell">cell</div>
        <div className="v-VerdantPanel-Summary-header-label r">
          <b>r</b>
        </div>
        <div className="v-VerdantPanel-Summary-header-label preview">
          preview
        </div>
      </div>
    );
  }

  private showTable() {
    return this.props.cells.map((c: artifactState, index: number) => {
      return (
        <SummaryRow
          cell_index={index}
          showDetails={this.props.showDetails}
          key={c.name + "_" + index}
        />
      );
    });
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(inspectNode(n));
      dispatch(switchTab(ActiveTab.Artifact_Details));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    cells: state.cellArtifacts,
    notebook: state.notebookArtifact,
    artifact_count: state.cellArtifacts.length,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SummaryTable);
