import * as React from "react";
import { Nodey, NodeyOutput } from "../../../verdant-model/nodey";
import { History } from "../../../verdant-model/history";
import {
  verdantState,
  showDetailOfNode,
  scrollToGhostCell,
} from "../../redux/";
import { connect } from "react-redux";
import { Namer } from "../../../verdant-model/sampler";

type Result_Props = {
  result: Nodey;
  search_query: string | null;
  openNodeDetails: (n: Nodey) => void;
  openGhostBook: (n: number) => void;
  scrollGhostToNodey: (n: Nodey) => void;
  history: History;
};

class Result extends React.Component<Result_Props, { sample: string }> {
  constructor(props: Result_Props) {
    super(props);
    this.state = { sample: "" };
  }

  componentDidMount() {
    this.props.history.ready.then(async () => {
      let sample = await this.props.history.inspector.search.renderSearchCell(
        this.props.result,
        this.props.search_query
      );

      this.setState({ sample: sample.outerHTML });
    });
  }

  render() {
    let notebook = this.props.history.store.getNotebookOf(this.props.result);
    let name = Namer.getVersionTitle(this.props.result);
    if (this.props.result instanceof NodeyOutput)
      name = Namer.getOutputVersionTitle(this.props.result, this.props.history);
    return (
      <div>
        <div className="VerdantPanel-search-results-artifact-header list-result">
          <div>
            <span
              className="verdant-link"
              onClick={() => this.props.openNodeDetails(this.props.result)}
            >
              {name}
            </span>
            <span>{" from "}</span>
            <span
              className={notebook ? "verdant-link" : ""}
              onClick={() => {
                if (notebook && this.props.openGhostBook) {
                  this.props.openGhostBook(notebook.version);
                  this.props.scrollGhostToNodey(this.props.result);
                }
              }}
            >
              {Namer.getNotebookTitle(notebook)}
            </span>
          </div>
        </div>
        <div
          className={"v-VerdantPanel-search-version"}
          onClick={() => {
            if (notebook && this.props.openGhostBook)
              this.props.openGhostBook(notebook.version);
          }}
          dangerouslySetInnerHTML={{ __html: this.state.sample }}
        ></div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    openNodeDetails: (inspectTarget?: Nodey) => {
      dispatch(showDetailOfNode(inspectTarget));
    },
    scrollGhostToNodey: (n: Nodey) => {
      dispatch(scrollToGhostCell(n.name));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    search_query: state.search.searchQuery,
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Result);
