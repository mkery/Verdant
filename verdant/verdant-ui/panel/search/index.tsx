import * as React from "react";
import { searchResult } from "../../../verdant-model/history";
import SearchBar from "./search-bar";
import ResultsSection from "./results-section";
import { verdantState } from "../../redux";
import { connect } from "react-redux";

type Search_Props = {
  results: searchResult[];
  openResults: string[];
};

class Search extends React.Component<Search_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-search">
        <SearchBar />
        <div className="v-VerdantPanel-searchContent">{this.showResults()}</div>
      </div>
    );
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

const mapStateToProps = (state: verdantState) => {
  return {
    openResults: state.search.openResults,
    results: state.search.searchResults,
  };
};

export default connect(mapStateToProps)(Search);
