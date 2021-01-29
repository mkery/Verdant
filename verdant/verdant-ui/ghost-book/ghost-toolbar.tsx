import * as React from "react";
import { connect } from "react-redux";
import { History } from "../../verdant-model/history";
import { Checkpoint } from "../../verdant-model/checkpoint";
import { verdantState, showEvent, changeDiffType } from "../redux/";
import { DIFF_TYPE } from "../../verdant-model/sampler";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExportIcon,
} from "../icons";
import { Namer } from "../../verdant-model/sampler";

interface GhostToolbar_Props {
  history: History;
  ver: number;
  diff: DIFF_TYPE;
  openGhostBook: (n: number) => void;
  openEvent: (c: Checkpoint) => void;
  setDiff: (diff: DIFF_TYPE) => void;
}

class Toolbar extends React.Component<
  GhostToolbar_Props,
  { dropdown_open: boolean; export_msg_open: boolean }
> {
  private readonly diffLabels: string[];

  constructor(props: GhostToolbar_Props) {
    super(props);
    this.state = { dropdown_open: false, export_msg_open: false };

    let diffLabels: string[] = [];
    diffLabels[DIFF_TYPE.CHANGE_DIFF] = "from prior";
    diffLabels[DIFF_TYPE.PRESENT_DIFF] = "from current";
    diffLabels[DIFF_TYPE.NO_DIFF] = "none";
    this.diffLabels = diffLabels;
  }

  public render() {
    // ignore rendering if no ghost book is showing
    if (this.props.ver === -1) return null;
    return (
      <div className="v-Verdant-GhostBook-header">
        <div className="v-Verdant-GhostBook-header-row">
          {this.showVersionSwitch()}
          {this.showTimestamp()}
          {this.showDiffOptions()}
          {this.showExportOptions()}
        </div>
        {this.showExportMessage()}
      </div>
    );
  }

  private showVersionSwitch() {
    return (
      <div className="v-Verdant-GhostBook-versionSwitch">
        <span onClick={() => this.props.openGhostBook(this.props.ver - 1)}>
          <ChevronLeftIcon />
        </span>
        <span className="v-Verdant-GhostBook-versionSwitch-label">{`v${Namer.getVersionNumberLabel(
          this.props.ver
        )}`}</span>
        <span onClick={() => this.props.openGhostBook(this.props.ver + 1)}>
          <ChevronRightIcon />
        </span>
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
      <div
        className="v-Verdant-GhostBook-header-timestamp"
        onClick={() => this.props.openEvent(created)}
      >
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
            {this.diffLabels[this.props.diff]}
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
          {this.diffLabels.map((option, index) => {
            return (
              <div
                key={index}
                className="v-Verdant-GhostBook-diffOptions-option"
                onClick={(ev) => {
                  ev.stopPropagation();
                  this.props.setDiff(index);
                  this.setState({ dropdown_open: false });
                  return false;
                }}
              >
                {option}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  }

  private showExportOptions() {
    return (
      <div
        className="v-Verdant-GhostBook-exportOptions"
        onClick={() => {
          this.setState({ export_msg_open: true });
          const notebook = this.props.history.store.getNotebook(this.props.ver);
          this.props.history.store.fileManager.saveGhostBook(
            this.props.history,
            notebook
          );
        }}
      >
        <ExportIcon />
        <span>Export</span>
      </div>
    );
  }

  private showExportMessage() {
    if (this.state.export_msg_open) {
      const notebook = this.props.history.store.getNotebook(this.props.ver);
      let name = this.props.history.notebook.name;
      if (name) {
        name =
          name.substring(0, name.indexOf(".")) +
          "-" +
          Namer.getNotebookVersionLabel(notebook) +
          ".ipynb";

        // hide after export is done or after a short delay
        setTimeout(() => this.setState({ export_msg_open: false }), 2000);

        return (
          <div className="v-Verdant-GhostBook-export-msg">{`Exporting notebook to ${name}`}</div>
        );
      }
    }
    return null;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    ver: state.ghostBook.notebook_ver,
    diff: state.ghostBook.diff,
    openGhostBook: state.openGhostBook,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    openEvent: (c: Checkpoint) => dispatch(showEvent(c)),
    setDiff: (diff: DIFF_TYPE) => dispatch(changeDiffType(diff)),
  };
};

const GhostToolbar = connect(mapStateToProps, mapDispatchToProps)(Toolbar);

export default GhostToolbar;
