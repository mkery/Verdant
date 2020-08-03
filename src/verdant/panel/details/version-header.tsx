import * as React from "react";
import { Nodey } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import { Checkpoint } from "../../../lilgit/checkpoint";
import { verdantState, inspectNode } from "../../redux/index";
import { connect } from "react-redux";
import { Namer } from "../../../lilgit/sampler";

export type VersionHeader_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  openGhostBook: (notebookVer: number) => void;
  nodey: Nodey;
};

class VersionHeader extends React.Component<VersionHeader_Props> {
  render() {
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

export default connect(mapStateToProps, mapDispatchToProps)(VersionHeader);
