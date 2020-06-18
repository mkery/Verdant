import * as React from "react";
import {
  ChangeType,
  Checkpoint,
  CheckpointType
} from "../../lilgit/model/checkpoint";
import {History} from "../../lilgit/model/history";
import {Nodey} from "../../lilgit/model/nodey";
import {verdantState} from "../redux/index";
import {connect} from "react-redux";

/* CSS Constants */
const LABEL = "v-Verdant-GhostBook-cell-header";

// Accumulator for computing labels based on events
type eventTypesAcc = {
  run: boolean;
  changed: boolean;
  newOutput: boolean;
  added: boolean;
  deleted: boolean;
  moved: boolean;
}

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
    return (
      <div
        className={LABEL}
        onClick={() => this.props.linkArtifact(this.props.name)}
      >
        {this.describe()}
      </div>
    );
  }


  private describe(): string {
    /* Generates text label for label cell */
    let cell = this.props.history.store.get(this.props.name);
    let text = `v ${cell.version} of ${GhostCellLabel.describeCell(cell)}`;

    // If non-output cell with events, add to description
    if (!this.props.name.startsWith("o") && this.props.events.length > 0)
      text += GhostCellLabel.describeEvents(this.processEvents());
    return text;
  }

  private processEvents(): eventTypesAcc {
    /* Accumulates types of changes of events attached to cell.
    * Helper method for describe. */

    // Initialize return accumulator for reducing over events
    const acc: eventTypesAcc = {
      run: false,
      changed: false,
      newOutput: false,
      added: false,
      deleted: false,
      moved: false
    }

    // Reduce over events to update accumulator
    this.props.events.reduce((acc, ev) => {
      switch (ev.checkpointType) {
        case CheckpointType.ADD:
          return {...acc, added: true};
        case CheckpointType.DELETE:
          return {...acc, deleted: true};
        case CheckpointType.MOVED:
          return {...acc, moved: true};
        case CheckpointType.RUN: {
          acc.moved = true;
          let cell = ev.targetCells.find(
            (cell) => cell.node === this.props.name
          );
          if (cell.changeType === ChangeType.CHANGED) acc.changed = true;
          if (cell.newOutput && cell.newOutput.length > 0) acc.newOutput = true;
          return acc;
        }
        case CheckpointType.SAVE: {
          let cell = ev.targetCells.find(
            (cell) => cell.node === this.props.name
          );
          if (cell.changeType === ChangeType.CHANGED) acc.changed = true;
          return acc;
        }
      }
    }, acc);

    return acc;
  }
   private static describeEvents(acc: eventTypesAcc): string {
    /* Computes label from accumulated event changes.
    * Helper method for describe. */
    // Initialize label
    let text = " ";

    // Compute label based on accumulator
    if (acc.run) { // if run
      if (acc.changed) { // if changed as well
        text += "edited then run";
      } else { // if not changed
        text += "run but not edited";
      }
      if (acc.newOutput) { // new output was produced
        text += " and produced new output";
      }
    } else if (acc.changed) { // changed
      text += "edited";
    }
    if (acc.added) { // if cells added
      text += "created";
    }
    if (acc.deleted) { // if cells deleted
      text += "deleted";
    }
    if (acc.moved) { // if cells moved
      text += "moved";
    }

    return text;
  }

  private static describeCell(nodey: Nodey): string {
    /* Generate string label describing type of cell.
    * Helper method for describe. */
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

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    linkArtifact: state.link_artifact,
  };
};

export default connect(mapStateToProps)(GhostCellLabel);
