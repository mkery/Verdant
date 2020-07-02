import * as React from "react";
import { History } from "../../lilgit/history/";
import VersionSearch from "../sampler/version-search";
import { Nodey } from "../../lilgit/nodey/";
import {
  searchForText,
  verdantState,
  inspectNode,
  switchTab,
  ActiveTab,
} from "../redux/index";
import { connect } from "react-redux";

type Search_Props = {
  history: History;
  openCrumbBox: (n: Nodey) => void;
  openGhostBook: (n: number) => void;
  search_query: string;
  searchFor: (string) => void;
};

type Search_State = {
  searchbox_text: string;
  search_results: Nodey[][][];
  result_labels: string[];
};

const PANEL = "v-VerdantPanel-content";
const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
const SEARCH_CONTENT = "v-VerdantPanel-searchContent";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const RESULT_CATEGORY = "VerdantPanel-search-results-category";
const RESULT_HEADER = "VerdantPanel-search-results-header";
const RESULT_CATEGORY_CONTENT = "VerdantPanel-search-results-category-content";

class Search extends React.Component<Search_Props, Search_State> {
  constructor(props: Search_Props) {
    super(props);
    this.state = {
      searchbox_text: "",
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
      <div className={PANEL}>
        <div className={SEARCH_CONTAINER}>
          <div className={SEARCH_ICON}></div>
          <input
            className={SEARCH_TEXT}
            contentEditable={true}
            value={this.state.searchbox_text}
            onChange={(ev) => {
              this.setState({ searchbox_text: ev.target.value });
            }}
            onKeyDown={(ev) => {
              if (ev.keyCode === 13) {
                ev.preventDefault();
                ev.stopPropagation();
                this.setState({ search_results: [] });
                this.props.searchFor(this.state.searchbox_text);
              }
            }}
          ></input>
        </div>
        <div className={SEARCH_CONTENT}>{this.showResults()}</div>
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
            {this.buildResultSection(this.state.search_results[index], label)}
          </div>
        );
      });
    }
    return null;
  }

  buildResultSection(results: Nodey[][], header: string) {
    let totalResults = 0;
    let resultElems = results.map((item) => {
      totalResults += item.length;
      let callback = () => {
        this.props.openCrumbBox(item[0]);
      };
      return (
        <div key={totalResults}>
          <VersionSearch
            history={this.props.history}
            nodey={item}
            query={this.props.search_query}
            callback={callback}
            notebookLink={this.props.openGhostBook}
          />
        </div>
      );
    });

    // TODO add caret to close the results category content
    return (
      <div className={RESULT_CATEGORY}>
        <div className={RESULT_HEADER}>
          <span>{`${header}: (${totalResults} match${
            totalResults === 1 ? "" : "es"
          })`}</span>
        </div>
        <div className={RESULT_CATEGORY_CONTENT}>{resultElems}</div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    searchFor: (text: string) => dispatch(searchForText(text)),
    openCrumbBox: (inspectTarget?: Nodey) => {
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

export default connect(mapStateToProps, mapDispatchToProps)(Search);
