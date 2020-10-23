import * as React from "react";
import { History } from "../../lilgit/history";
import SearchBar from "./search/search-bar";
import ResultsSection from "./search/results-section";
import { verdantState, searchResults, setResults, closeAll } from "../redux/";
import { connect } from "react-redux";

type Search_Props = {
  history: History;
  search_query: string | null;
  results: searchResults;
  openResults: string[];
  set_results: (results: searchResults) => void;
  close_all: () => void;
};

class Search extends React.Component<Search_Props> {
  componentDidUpdate(priorProps: Search_Props) {
    if (priorProps.search_query !== this.props.search_query) {
      this.props.set_results([]);
      this.props.close_all();
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
      let [markdown, mCount] = this.props.history.store.findMarkdown(query);
      let [code, cCount] = this.props.history.store.findCode(query);
      let [output, oCount] = this.props.history.store.findOutput(query);

      // finally set search results
      this.props.set_results([
        { label: "code cell", count: cCount, results: code },
        { label: "markdown cell", count: mCount, results: markdown },
        { label: "output", count: oCount, results: output },
      ]);
    }
  }

  showResults() {
    if (this.props.results.length > 0) {
      return this.props.results.map((results, index) => {
        return (
          <ResultsSection
            key={index}
            results={results.results}
            totalResults={results.count}
            title={results.label}
          />
        );
      });
    }
    return null;
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    set_results: (results: searchResults) => {
      dispatch(setResults(results));
    },
    close_all: () => dispatch(closeAll()),
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    search_query: state.search.searchQuery,
    history: state.getHistory(),
    openResults: state.search.openResults,
    results: state.search.searchResults,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Search);
