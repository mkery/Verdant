import * as React from "react";
import { History } from "../../lilgit/history";
import { Nodey } from "../../lilgit/nodey";
import SearchBar from "./search/search-bar";
import ResultsSection from "./search/search-results-section";
import { verdantState } from "../redux/index";
import { connect } from "react-redux";

type Search_Props = {
  history: History;
  search_query: string;
};

type Search_State = {
  search_results: Nodey[][][];
  result_labels: string[];
};

class Search extends React.Component<Search_Props, Search_State> {
  constructor(props: Search_Props) {
    super(props);
    this.state = {
      search_results: [],
      result_labels: [],
    };
  }

  componentDidUpdate(priorProps: Search_Props) {
    if (priorProps.search_query !== this.props.search_query) {
      this.setState({ search_results: [], result_labels: [] });
      this.search();
    }
  }

  render() {
    return (
      <div className="v-VerdantPanel-search">
        <SearchBar />
        <div className="v-VerdantPanel-searchContent">{this.showResults()}</div>
      </div>
    );
  }

  search() {
    let query = this.props.search_query;
    if (query && query.length > 0) {
      let markdown = this.props.history.store.findMarkdown(query);
      let code = this.props.history.store.findCode(query);
      let output = this.props.history.store.findOutput(query);

      // finally set search results
      this.setState({
        search_results: [code, markdown, output],
        result_labels: ["code", "markdown", "output"],
      });
    }
  }

  showResults() {
    if (this.state.search_results.length > 0) {
      return this.state.result_labels.map((label, index) => {
        return (
          <div key={index}>
            <ResultsSection
              results={this.state.search_results[index]}
              title={label}
            />
          </div>
        );
      });
    }
    return null;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    search_query: state.searchQuery,
    history: state.getHistory(),
  };
};

export default connect(mapStateToProps, null)(Search);
