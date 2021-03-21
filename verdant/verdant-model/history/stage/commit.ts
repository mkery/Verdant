import { FileManager } from "../../jupyter-hooks/file-manager";
import { Checkpoint, ChangeType, CellRunData } from "../../checkpoint";
import {
  NodeyCell,
  Nodey,
  NodeyCodeCell,
  NodeyOutput,
  NodeyNotebook,
  NodeyMarkdown,
  NodeyRawCell,
} from "../../nodey";
import { History } from "../history";
import { CodeHistory } from "../store";
import { Stage } from "./stage";
import { jsn } from "../../notebook";

export class Commit {
  readonly history: History;

  /*
   * The checkpoint and notebook are the identifying pieces of this commit
   */
  public checkpoint: Checkpoint;
  private notebook: NodeyNotebook;

  /*
   * The stage is for recording *potentially* edited nodey and figuring out
   * what was really edited and how for this commit
   */
  private stage: Stage;

  constructor(
    checkpoint: Checkpoint,
    history: History,
    fileManager: FileManager
  ) {
    this.checkpoint = checkpoint;
    this.history = history;
    this.stage = new Stage(history, fileManager);
  }

  public markAsPossiblyEdited(nodey: Nodey) {
    this.stage.dirty_nodey.push(nodey.name);
  }

  public addCell(added: NodeyCell, index: number) {
    // first see if this commit can be combined with a prior one
    const merged = this.attemptMergeWithPriorCheckpoint([added], [index]);

    // add cell is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // make sure new cell's parent is this newNotebook
    added.parent = this.notebook.name;
    let name = added.name;

    // make sure new cell's checkpoint is this one
    added.created = this.checkpoint.timestamp;

    // add added cell to notebook
    this.notebook.cells.splice(index, 0, name);

    // update checkpoint
    let cellDat = {
      cell: name,
      changeType: ChangeType.ADDED,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // record checkpoint
    if (!merged) this.history.checkpoints.add(this.checkpoint);
  }

  public deleteCell(deleted: NodeyCell) {
    let oldNotebook = this.history.store.currentNotebook;
    let index = oldNotebook?.cells?.indexOf(deleted?.name) || -1;

    // first see if this commit can be combined with a prior one
    const merged = this.attemptMergeWithPriorCheckpoint([deleted], [index]);

    // delete cell is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // remove deleted cell from notebook
    index = this.notebook.cells.indexOf(deleted.name);
    if (index > -1) this.notebook.cells.splice(index, 1);

    // update checkpoint
    let cellDat = {
      cell: deleted.name,
      changeType: ChangeType.REMOVED,
      index,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // record checkpoint
    if (!merged) this.history.checkpoints.add(this.checkpoint);
  }

  public moveCell(moved: NodeyCell, newPos: number) {
    // get position
    let name = moved.name;
    let oldNotebook = this.history.store.currentNotebook;
    let index = oldNotebook.cells.indexOf(name);

    // first see if this commit can be combined with a prior one
    const merged = this.attemptMergeWithPriorCheckpoint([moved], [index]);

    // moving a cell is an event that changes notebook version
    if (!this.notebook) this.createNotebookVersion();

    // move cell in the notebook
    if (index > -1) this.notebook.cells.splice(index, 1); // delete the pointer
    this.notebook.cells.splice(newPos, 0, name); // re-add in correct place

    // update checkpoint
    let cellDat = {
      cell: name,
      changeType: ChangeType.MOVED,
      index: newPos,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // record checkpoint
    if (!merged) this.history.checkpoints.add(this.checkpoint);
  }

  public changeCellType(oldCell: NodeyCell, newCell: NodeyCell) {
    // get position
    let name = oldCell.name;
    let oldNotebook = this.history.store.currentNotebook;
    let index = oldNotebook.cells.indexOf(name);

    // first see if this commit can be combined with a prior one
    const merged = this.attemptMergeWithPriorCheckpoint(
      [oldCell, newCell],
      [index]
    );

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
      cell: newCell.name,
      changeType: ChangeType.TYPE_CHANGED,
    } as CellRunData;
    this.checkpoint.targetCells.push(cellDat);

    // record checkpoint
    if (!merged) this.history.checkpoints.add(this.checkpoint);
  }

  // returns true if there are changes such that a new commit is recorded
  public async commit(options: jsn): Promise<void> {
    await this.stage.stage(options);
    if (this.stage.isEdited()) {
      const allStaged = this.stage.getAllStaged();
      // get indices
      let oldNotebook = this.history.store.currentNotebook;
      let indices = allStaged.map((s) => {
        const name = s.name;
        return oldNotebook.cells.indexOf(name);
      });

      // first see if this commit can be combined with a prior one
      const merged = this.attemptMergeWithPriorCheckpoint(allStaged, indices);

      // if there are real edits, make sure we have a new notebook
      if (!this.notebook) this.createNotebookVersion();
      this.commitStaged();

      // record checkpoint
      if (!merged) this.history.checkpoints.add(this.checkpoint);
    }
  }

  private commitStaged() {
    // now go through an update existing cells
    this.notebook.cells = this.notebook.cells.map((c) => {
      let cell = this.history.store.get(c);
      let instructions = cell ? this.stage.getStaging(cell) : null;
      if (instructions) {
        let newCell;
        if (cell instanceof NodeyCodeCell)
          newCell = this.createCodeCellVersion(cell.artifactName, instructions);
        else if (cell instanceof NodeyMarkdown)
          newCell = this.createMarkdownVersion(cell.artifactName, instructions);
        else if (cell instanceof NodeyRawCell)
          newCell = this.createRawCellVersion(cell.artifactName, instructions);
        return newCell?.name || c; // return unchanged cell if error occurred
      } else {
        // otherwise assume this cell is unchanged in this commit
        return c;
      }
    });
  }

  private attemptMergeWithPriorCheckpoint(
    targetedCells: Nodey[],
    indicies: number[]
  ): boolean {
    /*
     * We will try to add new changes to an existing notebook version if
     * 1) no changes on this commit conflict with existing changes on this notebook
     * version.
     * 2) changes on this commit occur within 5 minutes of existing changes on this
     * notebook version.
     *
     * The goal of this merge is to compress the number of overall notebook versions so
     * that there is less sparse information to shift through, and more meaty versions.
     */
    let pass = false;
    let oldNotebook = this.history.store.currentNotebook;
    let oldCheckpoints = this.history.checkpoints.getForNotebook(oldNotebook);
    if (oldCheckpoints.length > 0) {
      let latestCheckpoint = oldCheckpoints[oldCheckpoints.length - 1];
      // check that the latest checkpoint is within 5 min of this one
      pass = checkTimeDiff(latestCheckpoint, this.checkpoint);

      // check that the older checkpoint does not affect the same cells as this one
      if (pass) {
        pass = false;
        let oldTargets = latestCheckpoint?.targetCells?.map((target) =>
          this.history.store.get(target?.cell)
        );
        if (oldTargets) {
          pass = checkArtfiactOverlap(targetedCells, oldTargets);
        }

        // check that the older checkpoint does not affect the same cell indices as this one
        if (pass && indicies) {
          pass = latestCheckpoint.targetCells.every((target) => {
            if (target.index) return indicies.indexOf(target.index) < 0;
            return true;
          });
        }
      }

      // OK to merge
      if (pass) {
        this.notebook = oldNotebook;
        this.checkpoint = latestCheckpoint;
      }
    }

    return pass;
  }

  public createNotebookVersion() {
    let oldNotebook = this.history.store.currentNotebook;
    let newNotebook = new NodeyNotebook({
      id: oldNotebook?.id,
      created: this.checkpoint.id,
      cells: oldNotebook?.cells.slice(0) || [],
    });
    let notebookHist = this.history.store.getHistoryOf(oldNotebook);
    notebookHist?.addVersion(newNotebook);
    this.notebook = newNotebook;
    this.checkpoint.notebook = this.notebook?.version;
  }

  private createMarkdownVersion(
    artifactName: string,
    instructions: { markdown: string }
  ): NodeyMarkdown | undefined {
    // first create the new Markdown version
    let nodeyHistory = this.history.store.getHistoryOf(artifactName);
    let oldNodey = nodeyHistory?.latest;

    if (nodeyHistory && oldNodey) {
      let newNodey = new NodeyMarkdown({
        id: oldNodey.id,
        created: this.checkpoint.id,
        markdown: instructions.markdown,
        parent: this.notebook.name,
      });
      nodeyHistory.addVersion(newNodey);

      // then add the update to checkpoint
      let cellDat = {
        cell: newNodey.name,
        changeType: ChangeType.CHANGED,
      } as CellRunData;
      this.checkpoint.targetCells.push(cellDat);

      // finally return updated new version
      return newNodey;
    }
    console.error(
      "Failed to create new markdown version of ",
      artifactName,
      instructions
    );
  }

  private createRawCellVersion(
    artifactName: string,
    instructions: { literal: string }
  ): NodeyRawCell | undefined {
    // first create the new Raw Cell version
    let nodeyHistory = this.history.store.getHistoryOf(artifactName);
    let oldNodey = nodeyHistory?.latest;
    if (nodeyHistory && oldNodey) {
      let newNodey = new NodeyRawCell({
        id: oldNodey.id,
        created: this.checkpoint.id,
        literal: instructions.literal,
        parent: this.notebook.name,
      });
      nodeyHistory?.addVersion(newNodey);

      // then add the update to checkpoint
      let cellDat = {
        cell: newNodey.name,
        changeType: ChangeType.CHANGED,
      } as CellRunData;
      this.checkpoint.targetCells.push(cellDat);

      // finally return updated new version
      return newNodey;
    } else
      console.error(
        "Failed to create new raw cell version of ",
        artifactName,
        instructions
      );
  }

  private createCodeCellVersion(
    artifactName: string,
    instructions: { [key: string]: any }
  ): NodeyCodeCell | undefined {
    // build base code cell
    let nodeyHistory = this.history.store.getHistoryOf(
      artifactName
    ) as CodeHistory;
    let oldNodey = nodeyHistory?.latest;
    let newNodey;

    // error case only
    if (!nodeyHistory || !oldNodey) {
      console.error(
        "Failed to create new code cell version of ",
        artifactName,
        instructions
      );
      return;
    }

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
          created: this.checkpoint?.id,
          parent: newNodey.name,
          raw: instructions["output"],
        });
        oldOutputHist.addVersion(newOut);
      } else {
        // if there is no output history, create a new one
        // but only if raw is not empty
        if (instructions["output"].length > 0) {
          newOut = new NodeyOutput({
            created: this.checkpoint?.id,
            parent: newNodey.name,
            raw: instructions["output"],
          });
          this.history.store.store(newOut);
          nodeyHistory.addOutput(newNodey.version, newOut);
        }
      }
    }

    let changed = oldNodey.version !== newNodey.version;
    let changeKind: ChangeType;

    if (changed) changeKind = ChangeType.CHANGED;
    if (!changed && newOut) changeKind = ChangeType.OUTPUT_CHANGED;

    // update the checkpoint
    if (changeKind) {
      let cellDat = {
        cell: newNodey.name,
        changeType: changeKind,
        output: newOut ? [newOut.name] : [],
      } as CellRunData;
      this.checkpoint.targetCells.push(cellDat);
    }

    // finally return updated new version
    return newNodey;
  }
}

// helper functions
function checkTimeDiff(A: Checkpoint, B: Checkpoint): boolean {
  let minutes_elapsed = Math.abs(A.timestamp - B.timestamp) / 1000 / 60;
  return minutes_elapsed < 6;
}

function checkArtfiactOverlap(targets_A, targets_B): boolean {
  let B = targets_B?.map((target) => target.artifactName);
  if (B) {
    return targets_A.every((nodey) => {
      let artifactName = nodey.artifactName;
      return B.indexOf(artifactName) < 0;
    });
  }
  return false;
}
