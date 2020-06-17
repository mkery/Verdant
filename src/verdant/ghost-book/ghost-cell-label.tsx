import * as React from "react";
import {
  ChangeType,
  Checkpoint,
  CheckpointType
} from "../../lilgit/model/checkpoint";
import {History} from "../../lilgit/model/history";
import {Nodey, NodeyOutput} from "../../lilgit/model/nodey";
import {verdantState} from "../redux/index";
import {connect} from "react-redux";

type GhostCellLabel_Props = {
  // String id of the cell
  name: string;
  // Checkpoints associated with the cell
  events?: Checkpoint[];
  // Entire state history. Used for VersionSampler
  history?: History;
  // Function to link element to artifact panel.
  linkArtifact?: (name: string) => void;
};

class GhostCellLabel extends React.Component<GhostCellLabel_Props> {
  /* Component to render label for a ghost cell. */
  render() {
    let text = this.describe();
    return (
      <div
        className="v-Verdant-GhostBook-cell-header"
        onClick={() => this.props.linkArtifact(this.props.name)}
      >
        {text}
      </div>
    );
  }

  private describe() {
    /* Generates text label for label cell */
    if (this.props.name.startsWith("o")) { // output cell
      // Get NodeyOutput from history store
      let output = this.props.history.store.get(this.props.name) as NodeyOutput;
      return `v ${output.version} of ${GhostCellLabel.describeCell(output)}`;
    } else { // markdown or code cell
      return this.describeEvents();
    }
  }

  private describeEvents(): string {
    /* Computes description of events attached to cell.
    * TODO: Refactor for readability. */
    let cell = this.props.history.store.get(this.props.name);
    let text = "v" + cell.version + " of " + GhostCellLabel.describeCell(cell);
    if (this.props.events.length > 0) {
      let run = false;
      let changed = false;
      let newOutput = false;
      let added = false;
      let deleted = false;
      let moved = false;

      this.props.events.forEach((ev) => {
        switch (ev.checkpointType) {
          case CheckpointType.ADD:
            added = true;
            break;
          case CheckpointType.DELETE:
            deleted = true;
            break;
          case CheckpointType.MOVED:
            moved = true;
            break;
          case CheckpointType.RUN: {
            run = true;
            let cell = ev.targetCells.find(
              (cell) => cell.node === this.props.name
            );
            if (cell.changeType === ChangeType.CHANGED) changed = true;
            if (cell.newOutput && cell.newOutput.length > 0) newOutput = true;
            break;
          }
          case CheckpointType.SAVE: {
            let cell = ev.targetCells.find(
              (cell) => cell.node === this.props.name
            );
            if (cell.changeType === ChangeType.CHANGED) changed = true;
            break;
          }
        }
      });

      text += " was ";

      if (run) {
        if (changed) {
          text += "edited then run";
        } else text += "run but not edited";
        if (newOutput) text += " and produced new output";
      } else if (changed) {
        // changed not run
        text += "edited";
      }
      if (added) {
        text += "created";
      }
      if (deleted) {
        text += "deleted";
      }
      if (moved) text += "moved";
    }
    return text;
  }

  private static describeCell(nodey: Nodey): string {
    /* Generate string label describing type of cell */
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
) => {
  return {
    history: state.getHistory(),
    linkArtifact: state.link_artifact,
  };
};

export default connect(mapStateToProps)(GhostCellLabel);
