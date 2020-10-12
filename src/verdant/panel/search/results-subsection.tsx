import * as React from "react";
import { Nodey, NodeyOutput } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import {
  verdantState,
  showDetailOfNode,
  scrollToGhostCell,
  openResults,
  closeResults,
} from "../../redux/";
import { connect } from "react-redux";
import { Namer, DIFF_TYPE, SAMPLE_TYPE } from "../../../lilgit/sampler/";
import { VersionSampler } from "../../sampler/version-sampler";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons";
import Result from "./result";

type SubSection_Props = {
  nodey: Nodey;
  results: Nodey[];
  search_query: string;
  openNodeDetails: (n: Nodey) => void;
  openGhostBook: (n: number) => void;
  scrollGhostToNodey: (n: Nodey) => void;

  sectionOpen: boolean;
  openSection: () => void;
  closeSection: () => void;
  history: History;
};

class ResultsSubSection extends React.Component<
  SubSection_Props,
  { sample: string }
> {
  constructor(props: SubSection_Props) {
    super(props);
    this.state = { sample: null };
  }

  componentDidMount() {
    // load sample IF this result is a singleton
    if (this.props.results.length < 2) {
      this.props.history.ready.then(async () => {
        let sample = await VersionSampler.sample(
          SAMPLE_TYPE.SEARCH,
          this.props.history,
          this.props.results[0],
          this.props.search_query,
          DIFF_TYPE.NO_DIFF
        );

        this.setState({ sample: sample.outerHTML });
      });
    }
  }

  render() {
    if (this.props.results.length < 2) return this.showSingleton();
    else return this.showResultsPreview();
  }

  showSingleton() {
    let notebook = this.props.history.store.getNotebookOf(
      this.props.results[0]
    );
    let name = Namer.getVersionTitle(this.props.results[0]);
    if (this.props.results[0] instanceof NodeyOutput)
      name = Namer.getOutputVersionTitle(
        this.props.results[0] as NodeyOutput,
        this.props.history
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
            <span
              className="verdant-link"
              onClick={() => this.props.openNodeDetails(this.props.results[0])}
            >
              {name}
            </span>
            <span>{" from "}</span>
            <span
              className="verdant-link"
              onClick={() => {
                this.props.openGhostBook(notebook.version);
                this.props.scrollGhostToNodey(this.props.results[0]);
              }}
            >
              {Namer.getNotebookTitle(notebook)}
            </span>
          </div>
        </div>
        <div
          className={"v-VerdantPanel-search-version"}
          dangerouslySetInnerHTML={{ __html: this.state.sample }}
        ></div>
      </div>
    );
  }

  showResultsPreview() {
    return (
      <div className="VerdantPanel-search-results-artifact">
        <div
          className={`VerdantPanel-search-results-artifact-header${
            this.props.sectionOpen ? " open-artifact" : ""
          }`}
          onClick={() => {
            if (this.props.sectionOpen) this.props.closeSection();
            else this.props.openSection();
          }}
        >
          <div className="VerdantPanel-search-results-artifact-cell-title verdant-link">
            {this.showCaret()}
            <span onClick={() => this.props.openNodeDetails(this.props.nodey)}>
              {this.showArtifactTitle()}
            </span>
          </div>
          <span>{`${this.props.results.length} matching versions`}</span>
        </div>
        {this.showFullResults()}
      </div>
    );
  }

  showCaret() {
    if (this.props.sectionOpen) return <ChevronDownIcon />;
    else return <ChevronRightIcon />;
  }

  showArtifactTitle() {
    if (this.props.nodey instanceof NodeyOutput)
      return Namer.getOutputTitle(this.props.nodey, this.props.history);
    return Namer.getCellTitle(this.props.nodey);
  }

  showFullResults() {
    if (this.props.sectionOpen) {
      return this.props.results.map((r, index) => (
        <Result key={index} result={r} />
      ));
    }
  }
}

const mapDispatchToProps = (
  dispatch: any,
  ownProps: Partial<SubSection_Props>
) => {
  return {
    openNodeDetails: (inspectTarget?: Nodey) => {
      dispatch(showDetailOfNode(inspectTarget));
    },
    openSection: () => {
      dispatch(openResults(ownProps.nodey.artifactName));
    },
    closeSection: () => {
      dispatch(closeResults(ownProps.nodey.artifactName));
    },
    scrollGhostToNodey: (n: Nodey) => {
      dispatch(scrollToGhostCell(n.name));
    },
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<SubSection_Props>
) => {
  return {
    search_query: state.search.searchQuery,
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
    sectionOpen:
      ownProps.sectionOpen ||
      state.search.openResults.indexOf(ownProps.nodey.artifactName) > -1,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ResultsSubSection);
