import {
  Checkpoint,
  ChangeType,
  CellRunData,
  CheckpointType,
} from "../../checkpoint/";
import {
  NodeyCell,
  Nodey,
  NodeyCodeCell,
  NodeyOutput,
  NodeyNotebook,
  NodeyMarkdown,
  NodeyRawCell,
} from "../../nodey/";
import { History } from "../history";
import { CodeHistory } from "../store/";
import { Stage } from "./stage";

export class Commit {
  readonly history: History;

  /*
   * The checkpoint and notebook are the identifying pieces of this commit
   */
  readonly checkpoint: Checkpoint;
  private notebook: NodeyNotebook;

  /*
   * The stage is for recording *potentially* edited nodey and figuring out
   * what was really edited and how for this commit
   */
  private stage: Stage;

  constructor(checkpoint: Checkpoint, history: History) {
    this.checkpoint = checkpoint;
    this.history = history;
    this.stage = new Stage(history);
  }

  public markAsPossiblyEdited(nodey: Nodey) {
    this.stage.dirty_nodey.push(nodey.name);
  }

  public addCell(added: NodeyCell, index: number) {
    // add cell is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // make sure new cell's parent is this newNotebook
    added.parent = this.notebook.name;
    let name = added.name;

    // add added cell to notebook
    this.notebook.cells.splice(index, 0, name);

    // update checkpoint
    let cellDat = {
      node: name,
      changeType: ChangeType.ADDED,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);
  }

  public deleteCell(deleted: NodeyCell) {
    // delete cell is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // remove deleted cell from notebook
    let index = this.notebook.cells.indexOf(deleted.name);
    if (index > -1) this.notebook.cells.splice(index, 0, name);

    // update checkpoint
    let cellDat = {
      node: deleted.name,
      changeType: ChangeType.REMOVED,
      index,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);
  }

  public moveCell(moved: NodeyCell, newPos: number) {
    // moving a cell is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // move cell in the notebook
    let name = moved.name;
    let index = this.notebook.cells.indexOf(name);
    if (index > -1) this.notebook.cells.splice(index, 1); // delete the pointer
    this.notebook.cells.splice(newPos, 0, name); // re-add in correct place

    // update checkpoint
    let cellDat = {
      node: name,
      changeType: ChangeType.MOVED,
      index: newPos,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);
  }

  public changeCellType(oldCell: NodeyCell, newCell: NodeyCell) {
    // changing a cell type is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // make sure new cell's parent is this newNotebook
    newCell.parent = this.notebook.name;

    // now update cells of notebook
    let oldName = oldCell.name;
    let newName = newCell.name;
    let i = this.notebook.cells.indexOf(oldName);
    if (i > -1) this.notebook.cells.splice(i, 1, newName);

    // update checkpoint
    let cellDat = {
      node: newCell.name,
      changeType: ChangeType.TYPE_CHANGED,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);
  }

  public commit(): void {
    this.stage.stage();
    if (this.stage.isEdited()) {
      // if there are real edits, make sure we have a new notebook
      if (!this.notebook) this.createNotebookVersion();
      this.commitStaged();
    } else {
      // no real edits, so we stick with the same notebook
      if (!this.notebook) this.notebook = this.history.store.currentNotebook;
      this.checkpoint.notebook = this.notebook.version;

      // if this is a run event, record unchanged cells
      if (this.checkpoint.checkpointType === CheckpointType.RUN) {
        this.stage.dirty_nodey.forEach((name) => {
          // update to checkpoint
          let cellDat = {
            node: name,
            changeType: ChangeType.SAME,
          } as CellRunData;
          this.checkpoint.targetCells.push(cellDat);
        });
      }
    }
  }

  private commitStaged() {
    // now go through an update existing cells
    this.notebook.cells = this.notebook.cells.map((c) => {
      let cell = this.history.store.get(c);
      let instructions = this.stage.getStaging(cell);

      if (instructions) {
        let newCell;
        if (cell instanceof NodeyCodeCell)
          newCell = this.createCodeCellVersion(cell.artifactName, instructions);
        else if (cell instanceof NodeyMarkdown)
          newCell = this.createMarkdownVersion(cell.artifactName, instructions);
        else if (cell instanceof NodeyRawCell)
          newCell = this.createRawCellVersion(cell.artifactName, instructions);
        return newCell.name;
      } else {
        // otherwise assume this cell is unchanged in this commit
        return c;
      }
    });
  }

  private createNotebookVersion() {
    let oldNotebook = this.history.store.currentNotebook;
    let newNotebook = new NodeyNotebook({
      id: oldNotebook.id,
      created: this.checkpoint.id,
      cells: oldNotebook.cells.slice(0),
    });
    let notebookHist = this.history.store.getHistoryOf(oldNotebook);
    notebookHist.addVersion(newNotebook);
    this.notebook = newNotebook;
    this.checkpoint.notebook = this.notebook.version;
  }

  private createMarkdownVersion(
    artifactName: string,
    instructions: { markdown: string }
  ): NodeyMarkdown {
    // first create the new Markdown version
    let nodeyHistory = this.history.store.getHistoryOf(artifactName);
    let oldNodey = nodeyHistory.latest;
    let newNodey = new NodeyMarkdown({
      id: oldNodey.id,
      created: this.checkpoint.id,
      markdown: instructions.markdown,
      parent: this.notebook.name,
    });
    nodeyHistory.addVersion(newNodey);

    // then add the update to checkpoint
    let cellDat = {
      node: newNodey.name,
      changeType: ChangeType.CHANGED,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // finally return updated new version
    return newNodey;
  }

  private createRawCellVersion(
    artifactName: string,
    instructions: { literal: string }
  ): NodeyRawCell {
    // first create the new Raw Cell version
    let nodeyHistory = this.history.store.getHistoryOf(artifactName);
    let oldNodey = nodeyHistory.latest;
    let newNodey = new NodeyRawCell({
      id: oldNodey.id,
      created: this.checkpoint.id,
      literal: instructions.literal,
      parent: this.notebook.name,
    });
    nodeyHistory.addVersion(newNodey);

    // then add the update to checkpoint
    let cellDat = {
      node: newNodey.name,
      changeType: ChangeType.CHANGED,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // finally return updated new version
    return newNodey;
  }

  private createCodeCellVersion(
    artifactName: string,
    instructions: { [key: string]: any }
  ): NodeyCodeCell {
    // build base code cell
    let nodeyHistory = this.history.store.getHistoryOf(
      artifactName
    ) as CodeHistory;
    let oldNodey = nodeyHistory.latest;
    let newNodey;

    // check do we need a new cell version other than output?
    if (instructions["literal"] || instructions["content"]) {
      newNodey = new NodeyCodeCell({
        id: oldNodey.id,
        created: this.checkpoint.id,
        literal: instructions["literal"],
        parent: this.notebook.name,
      });
      nodeyHistory.addVersion(newNodey);
    } else newNodey = oldNodey;

    // now check if there is output to build
    let newOut: NodeyOutput;
    if (instructions["output"]) {
      // see if we already have an output history to add to
      let oldOutputHist = this.history.store.getOutput(newNodey);
      if (oldOutputHist) {
        let oldOut = oldOutputHist.latest;
        newOut = new NodeyOutput({
          id: oldOut.id,
          created: this.checkpoint.id,
          parent: newNodey.name,
          raw: instructions["output"],
        });
        oldOutputHist.addVersion(newOut);
      } else {
        // if there is no output history, create a new one
        // but only if raw is not empty
        if (instructions["output"].length > 0) {
          newOut = new NodeyOutput({
            created: this.checkpoint.id,
            parent: newNodey.name,
            raw: instructions["output"],
          });
          this.history.store.store(newOut);
          nodeyHistory.addOutput(newNodey.version, newOut);
        }
      }
    }

    let changed = oldNodey.version !== newNodey.version;
    // update the checkpoint
    let cellDat = {
      node: newNodey.name,
      changeType: changed ? ChangeType.CHANGED : ChangeType.SAME,
      newOutput: newOut ? [newOut.name] : [],
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // finally return updated new version
    return newNodey;
  }
}
