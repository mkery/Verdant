import * as React from "react";
import { Nodey } from "../../../lilgit/nodey/";
import { History } from "../../../lilgit/history/";
import { VersionSampler } from "../../sampler/version-sampler";
import { SAMPLE_TYPE, Sampler } from "../../../lilgit/sampler";
import { Checkpoint } from "../../../lilgit/checkpoint/";
import { verdantState, inspectNode } from "../../redux/index";
import { connect } from "react-redux";
import { Namer } from "../../../lilgit/sampler";

export type Version_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  openGhostBook: (notebookVer: number) => void;
  nodey: Nodey;
};

class VersionDetail extends React.Component<Version_Props, { sample: string }> {
  constructor(props: Version_Props) {
    super(props);
    this.state = {
      sample: "",
    };
  }

  componentDidMount() {
    this.getSample();
  }

  render() {
    return (
      <div className="v-VerdantPanel-details-version">
        {this.showHeader()}
        <div
          className="v-VerdantPanel-details-version-sample"
          dangerouslySetInnerHTML={{ __html: this.state.sample }}
        ></div>
      </div>
    );
  }

  showHeader() {
    let origin_notebook = this.props.history.store.getNotebookOf(
      this.props.nodey
    );
    let name = Namer.getVersionTitle(this.props.nodey);
    let split = name.lastIndexOf(".");
    let root = name.substring(0, split + 1);
    let ver = name.substring(split + 1);
    let created = this.props.history.checkpoints.get(this.props.nodey.created);

    return (
      <div className="v-VerdantPanel-details-version-header">
        <div className="v-VerdantPanel-details-version-header-labelRow">
          <span>{root}</span>
          <b>{ver}</b>
          <i>{" created in "}</i>
          <span
            className="verdant-link"
            onClick={() => this.props.openGhostBook(origin_notebook.version)}
          >
            {Namer.getNotebookTitle(origin_notebook)}
          </span>
        </div>
        <div className="v-VerdantPanel-details-version-header-labelRow date">
          <span className="verdant-link">{`${Checkpoint.formatTime(
            created.timestamp
          )} ${Checkpoint.formatShortDate(created.timestamp)}`}</span>
        </div>
      </div>
    );
  }

  async getSample() {
    await this.props.history.ready;
    let prior = this.props.history.store.getPriorVersion(this.props.nodey);
    let s: HTMLDivElement;
    if (prior != null) {
      s = await VersionSampler.sample(
        SAMPLE_TYPE.DIFF,
        this.props.history,
        this.props.nodey,
        null,
        Sampler.CHANGE_DIFF,
        prior.name
      );
    } else {
      s = await VersionSampler.sample(
        SAMPLE_TYPE.ARTIFACT,
        this.props.history,
        this.props.nodey
      );
    }
    this.setState({ sample: s.outerHTML });
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(inspectNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VersionDetail);
