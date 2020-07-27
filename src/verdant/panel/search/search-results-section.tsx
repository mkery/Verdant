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
import { ChevronRightIcon } from "../../icons/";

type ResultsSection_Props = {
  results: Nodey[][];
  title: string;
  openNodeDetails: (n: Nodey) => void;
  openGhostBook: (n: number) => void;
  search_query: string;
  history: History;
};

type ResultsSection_State = { totalResults: number; sectionOpen: boolean };

class ResultsSection extends React.Component<
  ResultsSection_Props,
  ResultsSection_State
> {
  constructor(props: ResultsSection_Props) {
    super(props);
    let totalResults = 0;
    this.props.results.map((item) => (totalResults += item.length));
    this.state = {
      totalResults,
      sectionOpen: false,
    };
  }

  render() {
    return (
      <div className="VerdantPanel-search-results-category">
        <div className="VerdantPanel-search-results-header">
          <ChevronRightIcon />
          <div className="VerdantPanel-search-results-header-title">{`${
            this.state.totalResults
          } result${this.state.totalResults === 1 ? "" : "s"} from ${
            this.props.title
          }`}</div>
        </div>
        {this.showResults()}
      </div>
    );
  }

  showResults() {
    if (this.state.sectionOpen)
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
