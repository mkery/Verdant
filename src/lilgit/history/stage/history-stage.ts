import { Nodey, NodeyCell } from "../../nodey";
import { History } from "..";
import { Checkpoint } from "../../checkpoint";
import { Commit } from "./commit";
import { log } from "../../notebook";

export class HistoryStage {
  readonly history: History;

  private open_commits: Commit[];

  constructor(history: History) {
    this.history = history;
    this.open_commits = [];
  }

  public commit(checkpoint: Checkpoint): void {
    let c = this.getCommit(checkpoint);
    c.commit();
    this.closeCommit(c); // TODO not strictly necessary??? when to close?
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
    this.closeCommit(c);
  }

  public commitCellDeleted(deleted: NodeyCell, checkpoint: Checkpoint): void {
    let c = this.getCommit(checkpoint);
    c.deleteCell(deleted);
    this.closeCommit(c);
  }

  public commitCellMoved(
    moved: NodeyCell,
    newPos: number,
    checkpoint: Checkpoint
  ): void {
    let c = this.getCommit(checkpoint);
    c.moveCell(moved, newPos);
    this.closeCommit(c);
  }

  public commitCellTypeChanged(
    oldCell: NodeyCell,
    newCell: NodeyCell,
    checkpoint: Checkpoint
  ): void {
    let c = this.getCommit(checkpoint);
    c.changeCellType(oldCell, newCell);
    this.closeCommit(c);
  }

  private getCommit(checkpoint: Checkpoint) {
    let c = this.open_commits.find((c) => c.checkpoint.id === checkpoint.id);
    if (!c) {
      c = new Commit(checkpoint, this.history);
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
