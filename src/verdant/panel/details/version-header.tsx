import * as React from "react";
import { Nodey } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import { Checkpoint } from "../../../lilgit/checkpoint";
import { verdantState, showDetailOfNode, showEvent } from "../../redux/";
import { connect } from "react-redux";
import { Namer } from "../../../lilgit/sampler";

export type VersionHeader_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  openGhostBook: (notebookVer: number) => void;
  nodey: Nodey;
  isTarget: boolean;
  openEvent: (c: Checkpoint) => void;
};

class VersionHeader extends React.Component<VersionHeader_Props> {
  render() {
    let origin_notebook = this.props.history.store.getNotebookOf(
      this.props.nodey
    );
    let created = this.props.history.checkpoints.get(this.props.nodey.created);

    return (
      <div className="v-VerdantPanel-details-version-header">
        <div className="v-VerdantPanel-details-version-header-labelRow">
          {this.showNodeyName()}
          <i>{" created in "}</i>
          <span
            className="verdant-link"
            onClick={() => this.props.openGhostBook(origin_notebook.version)}
          >
            {Namer.getNotebookTitle(origin_notebook)}
          </span>
        </div>
        <div
          className="v-VerdantPanel-details-version-header-labelRow date"
          onClick={() => this.props.openEvent(created)}
        >
          <span className="verdant-link">{`${Checkpoint.formatTime(
            created.timestamp
          )} ${Checkpoint.formatShortDate(created.timestamp)}`}</span>
        </div>
      </div>
    );
  }

  showNodeyName() {
    let name = Namer.getVersionTitle(this.props.nodey);
    let split = name.lastIndexOf(".");
    let root = name.substring(0, split + 1);
    let ver = name.substring(split + 1);

    if (this.props.isTarget) {
      return (
        <span>
          <span>{root}</span>
          <b>{ver}</b>
        </span>
      );
    } else {
      return (
        <span
          className="verdant-link"
          onClick={() => this.props.showDetails(this.props.nodey)}
        >
          <span>{root}</span>
          <b>{ver}</b>
        </span>
      );
    }
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(showDetailOfNode(n));
    },
    openEvent: (c: Checkpoint) => dispatch(showEvent(c)),
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<VersionHeader_Props>
) => {
  let nodeyName = ownProps.nodey.artifactName;
  const targetName = state.artifactView.inspectTarget.artifactName;
  return {
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
    isTarget: nodeyName === targetName,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VersionHeader);
