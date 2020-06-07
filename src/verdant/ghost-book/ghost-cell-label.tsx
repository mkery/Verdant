import * as React from "react";
import { CheckpointType, ChangeType } from "../../lilgit/model/checkpoint";
import { History } from "../../lilgit/model/history";
import { Nodey, NodeyOutput } from "../../lilgit/model/nodey";
import { verdantState } from "../redux/index";
import { ghostCellState } from "../redux/ghost";
import { connect } from "react-redux";

type GhostCellLabel_Props = {
  id: number;
  history?: History;
  linkArtifact?: (name: string) => void;
} & Partial<ghostCellState>; // loaded via redux

class CellLabel extends React.Component<GhostCellLabel_Props, {}> {
  render() {
    let text = this.describe();
    return (
      <div
        className={"v-Verdant-GhostBook-cell-header"}
        onClick={() => this.props.linkArtifact(this.props.name)}
      >
        {text}
      </div>
    );
  }

  private describe() {
    let text = "";
    if (this.props.name.startsWith("o")) {
      let output = this.props.history.store.get(this.props.name) as NodeyOutput;
      text = "v" + output.version + " of " + this.describeCell(output);
    } else text = this.describeEvents();
    return text;
  }

  private describeEvents(): string {
    let cell = this.props.history.store.get(this.props.name);
    let text = "v" + cell.version + " of " + this.describeCell(cell);
    if (this.props.events.length > 0) {
      let run = false;
      let changed = false;
      let newOutput = false;
      let added = false;
      let deleted = false;
      let moved = false;

      this.props.events.forEach((ev) => {
        if (ev.checkpointType === CheckpointType.ADD) added = true;
        else if (ev.checkpointType === CheckpointType.DELETE) deleted = true;
        else if (ev.checkpointType === CheckpointType.MOVED) moved = true;
        else if (ev.checkpointType === CheckpointType.RUN) {
          run = true;
          let cell = ev.targetCells.find(
            (cell) => cell.node === this.props.name
          );
          if (cell.changeType === ChangeType.CHANGED) changed = true;
          if (cell.newOutput && cell.newOutput.length > 0) newOutput = true;
        } else if (ev.checkpointType === CheckpointType.SAVE) {
          let cell = ev.targetCells.find(
            (cell) => cell.node === this.props.name
          );
          if (cell.changeType === ChangeType.CHANGED) changed = true;
        }
      });

      text += " was ";
      if (run) {
        if (changed) {
          text += "edited then run";
          // ** TODO this.changed = true;
        } else text += "run but not edited";
        if (newOutput) text += " and produced new output";
      } else if (changed) {
        // changed not run
        text += "edited";
        // ** TODO this.changed = true;
      }
      if (added) {
        text += "created";
        // ** TODO this.cell.classList.add("added");
      }
      if (deleted) {
        text += "deleted";
        // ** TODO this.cell.classList.add("removed");
      }
      if (moved) text += "moved";
    }
    return text;
  }

  private describeCell(nodey: Nodey): string {
    switch (nodey.typeChar) {
      case "c":
        return "Code cell " + nodey.id;
      case "m":
        return "Markdown " + nodey.id;
      case "o":
        return "Output " + nodey.id;
    }
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: GhostCellLabel_Props
) => {
  let cell = state.ghostCells[ownProps.id];
  return {
    ...ownProps,
    name: cell.name,
    events: cell.events,
    history: state.getHistory(),
    linkArtifact: state.link_artifact,
  };
};

const GhostCellLabel = connect(mapStateToProps)(CellLabel);

export default GhostCellLabel;
