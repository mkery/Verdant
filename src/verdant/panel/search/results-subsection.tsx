import * as React from "react";
import { Nodey, NodeyOutput } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import {
  verdantState,
  inspectNode,
  switchTab,
  ActiveTab,
} from "../../redux/index";
import { connect } from "react-redux";
import { Namer } from "../../../lilgit/sampler/";
import { ChevronRightIcon } from "../../icons";

type SubSection_Props = {
  nodey: Nodey;
  results: Nodey[];
  search_query: string;
  openNodeDetails: (n: Nodey) => void;
  openGhostBook: (n: number) => void;
  history: History;
};

class ResultsSubSection extends React.Component<SubSection_Props, {}> {
  render() {
    if (this.props.results.length < 2) return this.showSingleton();
    else return this.showResultsPreview();
    /*return (
      <VersionSearch
        history={this.props.history}
        nodey={this.props.results}
        query={this.props.search_query}
        callback={() => this.props.openNodeDetails(this.props.nodey)}
        notebookLink={this.props.openGhostBook}
      />
    );*/
  }

  showSingleton() {
    let notebook = this.props.history.store.getNotebookOf(
      this.props.results[0]
    );
    return (
      <div className="VerdantPanel-search-results-artifact">
        <div className="VerdantPanel-search-results-artifact-header">
          <div
            className="VerdantPanel-search-results-artifact-cell-title verdant-link"
            onClick={() => this.props.openNodeDetails(this.props.nodey)}
          >
            {this.showArtifactTitle()}
          </div>
          <div>
            <span className="verdant-link">
              {Namer.getVersionTitle(this.props.results[0])}
            </span>
            <span>{" from "}</span>
            <span className="verdant-link">
              {Namer.getNotebookTitle(notebook)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  showResultsPreview() {
    return (
      <div className="VerdantPanel-search-results-artifact">
        <div className="VerdantPanel-search-results-artifact-header">
          <div
            className="VerdantPanel-search-results-artifact-cell-title verdant-link"
            onClick={() => this.props.openNodeDetails(this.props.nodey)}
          >
            <ChevronRightIcon />
            {this.showArtifactTitle()}
          </div>
          <span>{`${this.props.results.length} matching versions`}</span>
        </div>
      </div>
    );
  }

  showArtifactTitle() {
    if (this.props.nodey instanceof NodeyOutput)
      return Namer.getOutputTitle(this.props.nodey, this.props.history);
    return Namer.getCellTitle(this.props.nodey);
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    openNodeDetails: (inspectTarget?: Nodey) => {
      dispatch(inspectNode(inspectTarget));
      dispatch(switchTab(ActiveTab.Artifact_Details));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    search_query: state.searchQuery,
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ResultsSubSection);
