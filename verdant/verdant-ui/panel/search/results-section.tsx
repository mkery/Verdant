import * as React from "react";
import { Nodey } from "../../../verdant-model/nodey";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons";
import ResultsSubSection from "./results-subsection";
import { connect } from "react-redux";
import { openResults, closeResults, verdantState } from "../../redux/";

type ResultsSection_Props = {
  results: Nodey[][];
  totalResults: number;
  title: string;
  // provided by redux store:
  sectionOpen?: boolean;
  openSection?: () => void;
  closeSection?: () => void;
};

class ResultsSection extends React.Component<ResultsSection_Props> {
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
          onClick={() => {
            if (this.props.totalResults > 0) {
              // don't open/close for empty results
              if (this.props.sectionOpen)
                this.props.closeSection ? this.props.closeSection() : null;
              else this.props.openSection ? this.props.openSection() : null;
            }
          }}
        >
          {this.showIcon()}
          <div className="VerdantPanel-search-results-header-title">{`appears in (${
            this.props.totalResults
          }) ${this.props.title}${this.props.totalResults === 1 ? "" : "s"}
          `}</div>
        </div>
        {this.showResults()}
      </div>
    );
  }

  showIcon() {
    // don't open/close for empty results
    if (this.props.totalResults > 0) {
      if (this.props.sectionOpen) return <ChevronDownIcon />;
      else return <ChevronRightIcon />;
    }
  }

  showResults() {
    if (this.props.sectionOpen)
      return (
        <div className="VerdantPanel-search-results-category-content">
          {this.props.results.map((item, index) => {
            return (
              <ResultsSubSection
                key={index}
                nodey={item[0]}
                results={item}
                sectionOpen={this.props.results.length < 2}
              />
            );
          })}
        </div>
      );
    return null;
  }
}

const mapDispatchToProps = (dispatch: any, ownProps: ResultsSection_Props) => {
  return {
    openSection: () => {
      dispatch(openResults(ownProps.title));
    },
    closeSection: () => {
      dispatch(closeResults(ownProps.title));
    },
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: ResultsSection_Props
) => {
  return {
    sectionOpen: state.search.openResults.indexOf(ownProps.title) > -1,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ResultsSection);
