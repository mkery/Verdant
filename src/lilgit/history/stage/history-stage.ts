import { Nodey, NodeyCell } from "../../nodey";
import { History } from "..";
import { Checkpoint } from "../../checkpoint";
import { Commit } from "./commit";
import { log } from "../../notebook";
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

  public async commit(checkpoint: Checkpoint): Promise<void> {
    let c = this.getCommit(checkpoint);
    // if commit was *actually* verified to be needed, it will return true
    if (await c.commit())
      this.history.checkpoints.set(checkpoint.id, checkpoint);
    this.closeCommit(c);
  }

  public markAsPossiblyEdited(nodey: Nodey, checkpoint: Checkpoint): void {
    let c = this.getCommit(checkpoint);
    c.markAsPossiblyEdited(nodey);
  }

  public commitCellAdded(
    added: NodeyCell,
    index: number,
    checkpoint: Checkpoint
  ): void {
    let c = this.getCommit(checkpoint);
    c.addCell(added, index);
    this.history.checkpoints.set(checkpoint.id, checkpoint);
    this.closeCommit(c);
  }

  public commitCellDeleted(deleted: NodeyCell, checkpoint: Checkpoint): void {
    let c = this.getCommit(checkpoint);
    c.deleteCell(deleted);
    this.history.checkpoints.set(checkpoint.id, checkpoint);
    this.closeCommit(c);
  }

  public commitCellMoved(
    moved: NodeyCell,
    newPos: number,
    checkpoint: Checkpoint
  ): void {
    let c = this.getCommit(checkpoint);
    c.moveCell(moved, newPos);
    this.history.checkpoints.set(checkpoint.id, checkpoint);
    this.closeCommit(c);
  }

  public commitCellTypeChanged(
    oldCell: NodeyCell,
    newCell: NodeyCell,
    checkpoint: Checkpoint
  ): void {
    let c = this.getCommit(checkpoint);
    c.changeCellType(oldCell, newCell);
    this.history.checkpoints.set(checkpoint.id, checkpoint);
    this.closeCommit(c);
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
