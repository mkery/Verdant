import * as React from "react";
import { connect } from "react-redux";
import { History } from "../../lilgit/history";
import { Checkpoint } from "../../lilgit/checkpoint";
import { verdantState } from "../redux/index";
import { toggleShowAllCells } from "../redux/ghost";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

/* CSS Constants */
const JP_TOOLBAR = "jp-Toolbar";

interface GhostToolbar_Props {
  history: History;
  name: number;
  diffPresent: boolean;
  toggleShow: () => void;
}

class Toolbar extends React.Component<GhostToolbar_Props> {
  public render() {
    return (
      <div className={`v-Verdant-GhostBook-header ${JP_TOOLBAR}`}>
        <div className="v-Verdant-GhostBook-header-row">
          {this.showVersionSwitch()}
          {this.showLabel()}
        </div>
      </div>
    );
  }

  private showVersionSwitch() {
    return (
      <div className="v-Verdant-GhostBook-versionSwitch">
        <ChevronLeftIcon />
        <span className="v-Verdant-GhostBook-versionSwitch-label">{`v${this.props.name}`}</span>
        <ChevronRightIcon />
      </div>
    );
  }

  private showLabel() {
    let notebook = this.props.history.store.getNotebook(this.props.name);
    let created = this.props.history.checkpoints.get(notebook.created);

    let time;
    if (created)
      // error save from older log format
      time =
        Checkpoint.formatDate(created.timestamp) +
        " " +
        Checkpoint.formatTime(created.timestamp);

    return <div>{time ? time : ""}</div>;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    name: state.notebook_ver,
    diffPresent: state.diffPresent,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    toggleShow: () => dispatch(toggleShowAllCells()),
  };
};

const GhostToolbar = connect(mapStateToProps, mapDispatchToProps)(Toolbar);

export default GhostToolbar;
