import * as React from "react";
import { Nodey } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import VersionSearch from "../../sampler/version-search";
import {
  verdantState,
  inspectNode,
  switchTab,
  ActiveTab,
} from "../../redux/index";
import { connect } from "react-redux";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons/";

type ResultsSection_Props = {
  results: Nodey[][];
  totalResults: number;
  sectionOpen: boolean;
  title: string;
  openSection: () => void;
  openNodeDetails: (n: Nodey) => void;
  openGhostBook: (n: number) => void;
  search_query: string;
  history: History;
};

class ResultsSection extends React.Component<ResultsSection_Props, {}> {
  render() {
    return (
      <div
        className={`VerdantPanel-search-results-category${
          this.props.sectionOpen ? " open" : ""
        }`}
      >
        <div
          className={`VerdantPanel-search-results-header${
            this.props.sectionOpen ? " open" : ""
          }`}
          onClick={this.props.openSection}
        >
          {this.showIcon()}
          <div className="VerdantPanel-search-results-header-title">{`${
            this.props.totalResults
          } result${this.props.totalResults === 1 ? "" : "s"} from ${
            this.props.title
          }`}</div>
        </div>
        {this.showResults()}
      </div>
    );
  }

  showIcon() {
    if (this.props.sectionOpen) return <ChevronDownIcon />;
    else return <ChevronRightIcon />;
  }

  showResults() {
    if (this.props.sectionOpen)
      return (
        <div className="VerdantPanel-search-results-category-content">
          {this.props.results.map((item, index) => {
            let callback = () => {
              this.props.openNodeDetails(item[0]);
            };
            return (
              <div key={index}>
                <VersionSearch
                  history={this.props.history}
                  nodey={item}
                  query={this.props.search_query}
                  callback={callback}
                  notebookLink={this.props.openGhostBook}
                />
              </div>
            );
          })}
        </div>
      );
    return null;
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

export default connect(mapStateToProps, mapDispatchToProps)(ResultsSection);
