import * as React from "react";
import Summary from "./summary/summary";
import InspectorButton from "./summary/inspector-button";
import {
  ActiveTab,
  switchTab,
  verdantState,
  artifactState,
} from "../redux/index";
import { connect } from "react-redux";

const PANEL = "v-VerdantPanel-content";
const HEADER = "v-VerdantPanel-tab-header";
const SUMMARY_TITLE = "v-VerdantPanel-Summary-title";

export type ArtifactSummaryPane_Props = {
  showDetail: () => void;
  notebook: artifactState;
};

class ArtifactSummary extends React.Component<ArtifactSummaryPane_Props> {
  render() {
    return (
      <div className={PANEL}>
        <div className={HEADER}>
          <span className={SUMMARY_TITLE}>
            {this.props.notebook.file}
            <b>{` v${this.props.notebook.ver}`}</b>
            {" by "}
            <i>artifact revisions:</i>
          </span>
        </div>
        <Summary />
        <InspectorButton />
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetail: () => {
      dispatch(switchTab(ActiveTab.Artifact_Details));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    notebook: state.notebookArtifact,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ArtifactSummary);
