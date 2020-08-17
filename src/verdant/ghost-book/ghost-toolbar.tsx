import * as React from "react";
import { connect } from "react-redux";
import { History } from "../../lilgit/history";
import { Checkpoint } from "../../lilgit/checkpoint";
import { verdantState, toggleShowAllCells } from "../redux/";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "../icons";
import { Namer } from "../../lilgit/sampler/";

/* CSS Constants */
const JP_TOOLBAR = "jp-Toolbar";

interface GhostToolbar_Props {
  history: History;
  ver: number;
  diffPresent: boolean;
  toggleShow: () => void;
}

class Toolbar extends React.Component<
  GhostToolbar_Props,
  { dropdown_open: boolean }
> {
  constructor(props: GhostToolbar_Props) {
    super(props);
    this.state = { dropdown_open: false };
  }

  public render() {
    return (
      <div className={`v-Verdant-GhostBook-header ${JP_TOOLBAR}`}>
        <div className="v-Verdant-GhostBook-header-row">
          {this.showVersionSwitch()}
          {this.showTimestamp()}
          {this.showDiffOptions()}
        </div>
      </div>
    );
  }

  private showVersionSwitch() {
    return (
      <div className="v-Verdant-GhostBook-versionSwitch">
        <ChevronLeftIcon />
        <span className="v-Verdant-GhostBook-versionSwitch-label">{`v${Namer.getVersionNumberLabel(
          this.props.ver
        )}`}</span>
        <ChevronRightIcon />
      </div>
    );
  }

  private showTimestamp() {
    let notebook = this.props.history.store.getNotebook(this.props.ver);
    let created = this.props.history.checkpoints.get(notebook.created);

    let time;
    if (created)
      // error save from older log format
      time =
        Checkpoint.formatDate(created.timestamp) +
        " " +
        Checkpoint.formatTime(created.timestamp);

    return (
      <div className="v-Verdant-GhostBook-header-timestamp">
        {time ? time : ""}
      </div>
    );
  }

  private showDiffOptions() {
    return (
      <div
        className="v-Verdant-GhostBook-diffOptions"
        onClick={() =>
          this.setState({ dropdown_open: !this.state.dropdown_open })
        }
      >
        <span>show differences</span>
        <div className="v-Verdant-GhostBook-diffOptions-dropdown">
          <div className="v-Verdant-GhostBook-diffOptions-option">
            from prior
          </div>
          <ChevronDownIcon />
          {this.showDropdownList()}
        </div>
      </div>
    );
  }

  private showDropdownList() {
    if (this.state.dropdown_open) {
      return (
        <div className="v-Verdant-GhostBook-diffOptions-dropdown-list">
          <div className="v-Verdant-GhostBook-diffOptions-option">
            from prior
          </div>
          <div className="v-Verdant-GhostBook-diffOptions-option">
            from current
          </div>
          <div className="v-Verdant-GhostBook-diffOptions-option">none</div>
        </div>
      );
    }
    return null;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    ver: state.notebook_ver,
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
