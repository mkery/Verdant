import * as React from "react";
import { History } from "../../../verdant-model/history";
import { Nodey } from "../../../verdant-model/nodey";
import { connect } from "react-redux";
import { verdantState, showDetailOfNode, artifactState } from "../../redux/";
import { SummaryRow } from "./summary-row";

export type Summary_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  cells: artifactState[];
  notebook: artifactState | null;
  artifact_count: number;
  focused_cell: number | null;
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
          <b>revision</b>
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
          focused={this.props.focused_cell === index}
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
      dispatch(showDetailOfNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    cells: state.cellArtifacts,
    notebook: state.notebookArtifact,
    artifact_count: state.cellArtifacts.length,
    focused_cell: state.focusedCell,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SummaryTable);
