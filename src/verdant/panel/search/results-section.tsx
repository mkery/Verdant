import * as React from "react";
import { Nodey } from "../../../lilgit/nodey";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons";
import ResultsSubSection from "./results-subsection";

type ResultsSection_Props = {
  results: Nodey[][];
  totalResults: number;
  sectionOpen: boolean;
  title: string;
  openSection: () => void;
};

export default class ResultsSection extends React.Component<
  ResultsSection_Props,
  {}
> {
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
            return (
              <ResultsSubSection key={index} nodey={item[0]} results={item} />
            );
          })}
        </div>
      );
    return null;
  }
}
