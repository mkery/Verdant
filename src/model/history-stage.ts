import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCell,
  NodeyCodeCell,
  NodeyMarkdown,
  SyntaxToken
} from "./nodey";

import { CodeCell } from "@jupyterlab/cells";

import { HistoryStore } from "./history-store";

import { NodeyFactory } from "./nodey-factory";

import { Checkpoint } from "./checkpoint";

/*
* little wrapper class for pending changes with a star
*/
export class Star<T extends Nodey> {
  readonly value: T;
  cellId: string = "?";

  constructor(nodey: T) {
    this.value = nodey;
  }

  get name(): string {
    return this.value.typeChar + "." + this.value.id + ".?";
  }
}

export class HistoryStage {
  readonly store: HistoryStore;

  constructor(store: HistoryStore) {
    this.store = store;
  }

  // in charge of the stage and commit phases of history
  /*public clearCellStatus(cell: NodeyCell) {
    var status = cell.cell.status;
    if (status !== ChangeType.REMOVED) cell.cell.clearStatus();
    else {
      cell.cell.dispose();
      cell.cell = null;
      var index = this._cellList.indexOf(cell.id);
      this._cellList.splice(index, 1);
      this._deletedCellList.push(cell.id);
    }
  }*/

  public markAsEdited(unedited: Nodey): Star<Nodey> {
    if (unedited instanceof NodeyCode) {
      return this.markCodeAsEdited(unedited);
    } else if (unedited instanceof NodeyMarkdown) {
      return this.markMarkdownAsEdited(unedited);
    }
  }

  private markMarkdownAsEdited(unedited: NodeyMarkdown): Star<NodeyMarkdown> {
    if (unedited instanceof Star) {
      //already a star node
      return unedited;
    }
    let history = this.store.getHistoryOf(unedited);
    let nodey = history.versions[history.versions.length - 1];
    let nodeyCopy = new NodeyMarkdown(nodey);
    let starNode = new Star<NodeyMarkdown>(nodeyCopy);
    history.setLatestToStar(starNode);
    return starNode;
  }

  private markCodeAsEdited(unedited: NodeyCode): Star<NodeyCode> {
    if (unedited instanceof Star) {
      //already a star node
      return unedited;
    }

    //otherwise, a normal node with a history
    let history = this.store.getHistoryOf(unedited);
    console.log("history of this node", history, unedited);

    //newly entering star state!
    let nodey = history.versions[history.versions.length - 1];
    let nodeyCopy = new NodeyCode(nodey);
    let starNode = new Star<NodeyCode>(nodeyCopy);

    if (starNode.value.parent) {
      console.log("parent is", starNode.value.parent, starNode.value);
      // star all the way up the chain
      let parent = this.store.getLatestOf(starNode.value.parent) as NodeyCode;
      var starParent = this.markCodeAsEdited(parent);
      //TODO eventually the parent should be the notebook

      //finally, fix pointer names to be stars too
      starNode.value.parent = starParent.name;
      let childIndex = starParent.value.content.indexOf(nodey.name);
      starParent.value.content[childIndex] = starNode.name;
    }
    history.setLatestToStar(starNode);
    return starNode;
  }

  /*
  * should return if there is any changes to commit true/false
  */
  public commit(
    checkpoint: Checkpoint,
    starCell?: Star<NodeyCell> | NodeyCell
  ) {
    //TODO commit the notebook

    if (starCell) {
      if (starCell instanceof Star) {
        this.commitCell(starCell, checkpoint.id);
      }
    }
  }

  private commitCell(starCell: Star<NodeyCell>, runId: number) {
    let cell = this.deStarCell(starCell);
    console.log("Cell to commit is " + cell.name, cell, runId);

    if (cell instanceof NodeyCodeCell) {
      let output = this._commitOutput(cell, runId);
      console.log("Output committed", output);
      this._commitCode(cell, runId, output);
      this.store.cleanOutStars(cell);
    }

    return cell;
  }

  private deStarCell(star: Star<NodeyCell>): NodeyCell {
    let history = this.store.getHistoryOf(star.value);
    return history.deStar() as NodeyCell;
  }

  private deStar(star: Star<Nodey>) {
    let newNodey = star.value;
    this.store.store(newNodey);
    console.log("star node now ", newNodey);
    return newNodey;
  }

  /*private _commitMarkdown(nodey: NodeyMarkdown, runId: number) {
    let priorText = nodey.markdown;
    let cell = nodey.cell.cell;
    let score = 0;
    if (cell && cell.model) {
      //cell has not been deleted!
      let newText = cell.model.value.text;
      score = levenshtein.get(priorText, newText);
      if (score > 0) {
        nodey.cell.status = ChangeType.CHANGED;
        let history = this.store.getHistoryOf(nodey);
        let newCell = new NodeyMarkdown(nodey);
        newCell.markdown = newText;
        newCell.created = runId;
        return history.deStar(runId) as NodeyMarkdown;
      }
    }
    if (score === 0) {
      nodey.run.push(runId);
      return nodey;
    }
  }*/

  private _commitOutput(nodey: NodeyCodeCell, runId: number) {
    let oldOutput = nodey.getOutput();
    let oldRun = -1;
    let old = oldOutput.map(out => {
      let output = this.store.get(out);
      if (oldRun < 0 || output.created === oldRun) {
        return output as NodeyOutput;
      }
    });
    return NodeyFactory.outputToNodey(
      nodey.cell.cell as CodeCell,
      this.store,
      old,
      runId
    );
  }

  private _commitCode(
    parentNodey: NodeyCode,
    runId: number,
    output: string[],
    prior: NodeyCode = null
  ) {
    if (prior) prior.right = parentNodey.name;
    prior = null;

    if (parentNodey.content)
      parentNodey.content = parentNodey.content.map(
        (child: Star<Nodey> | string | SyntaxToken, index: number) => {
          if (child instanceof Star) {
            let newChild = this.deStar(child) as NodeyCode;
            output.forEach(out => newChild.addOutput(out));
            newChild.created = runId;

            parentNodey.content[index] = newChild.name;
            newChild.parent = parentNodey.name;
            if (prior) prior.right = newChild.name;
            prior = newChild;
            return newChild.name;
          } else if (typeof child === "string") {
            let nodeChild = this.store.get(child);
            nodeChild.parent = parentNodey.name;
            if (prior) prior.right = nodeChild.name;
          }
          return child;
        }
      );
  }
}
