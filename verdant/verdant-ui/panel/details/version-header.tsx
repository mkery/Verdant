import * as React from "react";
import { Nodey, NodeyOutput } from "../../../verdant-model/nodey";
import { History } from "../../../verdant-model/history";
import { Checkpoint } from "../../../verdant-model/checkpoint";
import {
  verdantState,
  showDetailOfNode,
  showEvent,
  scrollToGhostCell,
} from "../../redux/";
import { connect } from "react-redux";
import { Namer } from "../../../verdant-model/sampler";

export type VersionHeader_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  openGhostBook: (notebookVer: number) => void;
  scrollGhostToNodey: (n: Nodey) => void;
  nodey: Nodey;
  isTarget: boolean;
  openEvent: (c: Checkpoint) => void;
  selected: boolean;
};

class VersionHeader extends React.Component<VersionHeader_Props> {
  render() {
    let origin_notebook = this.props.history.store.getNotebookOf(
      this.props.nodey
    );
    let created = this.props.history.checkpoints.get(this.props.nodey?.created);

    return (
      <div
        className={`v-VerdantPanel-details-version-header${
          this.props.selected ? " selected" : ""
        }`}
      >
        <div className="v-VerdantPanel-details-version-header-labelRow">
          {this.showNodeyName()}
          <i>{" created in "}</i>
          <span
            className="verdant-link"
            onClick={() => {
              if (origin_notebook) {
                this.props.openGhostBook(origin_notebook.version);
                this.props.scrollGhostToNodey(this.props.nodey);
              }
            }}
          >
            {origin_notebook ? Namer.getNotebookTitle(origin_notebook) : ""}
          </span>
        </div>
        <div
          className="v-VerdantPanel-details-version-header-labelRow date"
          onClick={() => {
            if (created) this.props.openEvent(created);
          }}
        >
          <span className="verdant-link">{`${Checkpoint.formatTime(
            created?.timestamp
          )} ${Checkpoint.formatShortDate(created?.timestamp)}`}</span>
        </div>
      </div>
    );
  }

  showNodeyName() {
    let name = Namer.getVersionTitle(this.props.nodey);
    if (this.props.nodey instanceof NodeyOutput)
      name = Namer.getOutputVersionTitle(this.props.nodey, this.props.history);
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
    scrollGhostToNodey: (n: Nodey) => {
      dispatch(scrollToGhostCell(n.name));
    },
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<VersionHeader_Props>
) => {
  const nodeyName = ownProps.nodey?.artifactName;
  const targetName = state.artifactView?.inspectTarget?.artifactName;
  return {
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
    isTarget:
      nodeyName != undefined &&
      targetName != undefined &&
      nodeyName === targetName,
    selected:
      state.artifactView?.selectedArtifactDetail === ownProps.nodey?.name,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VersionHeader);
