import { Nodey, NodeyCell } from "../../nodey";
import { History } from "..";
import { Checkpoint } from "../../checkpoint";
import { Commit } from "./commit";
import { log, jsn } from "../../notebook";
import { FileManager } from "../../jupyter-hooks/file-manager";

export class HistoryStage {
  private readonly history: History;
  private readonly fileManager: FileManager;
  private open_commits: Commit[];

  constructor(history: History, fileManager: FileManager) {
    this.history = history;
    this.fileManager = fileManager;
    this.open_commits = [];
  }

  public async commit(
    checkpoint: Checkpoint,
    options: jsn = {}
  ): Promise<Checkpoint> {
    let c = this.getCommit(checkpoint);
    // if commit was *actually* verified to be needed, it will record new versions
    try {
      await c.commit(options);
    } catch (error) {
      console.error("Verdant: Error in making commit: ", error);
    }
    this.closeCommit(c);
    return c.checkpoint;
  }

  public markAsPossiblyEdited(nodey: Nodey, checkpoint: Checkpoint): void {
    let c = this.getCommit(checkpoint);
    c.markAsPossiblyEdited(nodey);
  }

  public commitCellAdded(
    added: NodeyCell,
    index: number,
    checkpoint: Checkpoint
  ): Checkpoint {
    let c = this.getCommit(checkpoint);
    c.addCell(added, index);
    this.closeCommit(c);
    return c.checkpoint;
  }

  public commitCellDeleted(
    deleted: NodeyCell,
    checkpoint: Checkpoint
  ): Checkpoint {
    let c = this.getCommit(checkpoint);
    c.deleteCell(deleted);
    this.closeCommit(c);
    return c.checkpoint;
  }

  public commitCellMoved(
    moved: NodeyCell,
    newPos: number,
    checkpoint: Checkpoint
  ): Checkpoint {
    let c = this.getCommit(checkpoint);
    c.moveCell(moved, newPos);
    this.closeCommit(c);
    return c.checkpoint;
  }

  public commitCellTypeChanged(
    oldCell: NodeyCell,
    newCell: NodeyCell,
    checkpoint: Checkpoint
  ): Checkpoint {
    let c = this.getCommit(checkpoint);
    c.changeCellType(oldCell, newCell);
    this.closeCommit(c);
    return c.checkpoint;
  }

  private getCommit(checkpoint: Checkpoint) {
    let c = this.open_commits.find((c) => c.checkpoint.id === checkpoint.id);
    if (!c) {
      c = new Commit(checkpoint, this.history, this.fileManager);
      this.open_commits.push(c);
    }
    return c;
  }

  private closeCommit(commit: Commit) {
    let i = this.open_commits.indexOf(commit);
    if (i > -1) this.open_commits.splice(i, 1);
    let notebook = this.history.store.getNotebook(commit.checkpoint.notebook);
    log("Commit complete:", commit.checkpoint, notebook);
  }
}
