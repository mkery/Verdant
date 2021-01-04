import * as React from "react";
import SummaryTable from "./summary-table";
import InspectorButton from "../inspector-button";
import { verdantState, artifactState } from "../../redux";
import { connect } from "react-redux";
import { Namer } from "../../../verdant-model/sampler";
import { History } from "../../../verdant-model/history";

const PANEL = "v-VerdantPanel-content";
const HEADER = "v-VerdantPanel-tab-header";
const SUMMARY_TITLE = "v-VerdantPanel-Summary-title";

export type ArtifactSummaryPane_Props = {
  notebook: artifactState;
  history: History;
};

class ArtifactSummary extends React.Component<ArtifactSummaryPane_Props> {
  render() {
    let notebookNodey = this.props.history.store.getNotebook(
      this.props.notebook.ver
    );
    return (
      <div className={PANEL}>
        <div className={HEADER}>
          <span className={SUMMARY_TITLE}>
            {this.props.notebook.file}
            <b>{` ${Namer.getNotebookVersionLabel(notebookNodey)}`}</b>
            {" by "}
            <i>{"artifact revisions:"}</i>
          </span>
        </div>
        <SummaryTable />
        <InspectorButton />
      </div>
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    notebook: state.notebookArtifact,
    history: state.getHistory(),
  };
};

export default connect(mapStateToProps, null)(ArtifactSummary);
