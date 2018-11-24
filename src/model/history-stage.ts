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

import { History } from "./history";

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

  get id(): number {
    return this.value.id;
  }

  get name(): string {
    return "*" + "." + this.value.typeChar + "." + this.value.id;
  }
}

export class HistoryStage {
  readonly history: History;

  constructor(history: History) {
    this.history = history;
  }

  private get store() {
    return this.history.store;
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

  public markAsEdited(unedited: Nodey | Star<Nodey>): Star<Nodey> {
    if (unedited instanceof Star) return unedited;
    if (unedited instanceof NodeyCode) {
      return this.markCodeAsEdited(unedited);
    } else if (unedited instanceof NodeyMarkdown) {
      return this.markMarkdownAsEdited(unedited);
    }
  }

  private markMarkdownAsEdited(unedited: NodeyMarkdown): Star<NodeyMarkdown> {
    let history = this.store.getHistoryOf(unedited);
    let nodey = history.latest;
    let starNode: Star<NodeyMarkdown>;
    if (nodey instanceof Star) {
      starNode = nodey as Star<NodeyMarkdown>;
    } else {
      starNode = this.createStar(nodey) as Star<NodeyMarkdown>;
      history.setLatestToStar(starNode);
    }
    return starNode;
  }

  private createStar(nodey: Nodey) {
    let starNode;
    if (nodey instanceof NodeyMarkdown) {
      let nodeyCopy = new NodeyMarkdown(nodey as NodeyMarkdown);
      starNode = new Star<NodeyMarkdown>(nodeyCopy);
    } else if (nodey instanceof NodeyCodeCell) {
      let nodeyCopy = new NodeyCodeCell(nodey);
      starNode = new Star<NodeyCodeCell>(nodeyCopy);
    } else if (nodey instanceof NodeyCode) {
      let nodeyCopy = new NodeyCode(nodey);
      starNode = new Star<NodeyCode>(nodeyCopy);
    }
    return starNode;
  }

  private markCodeAsEdited(unedited: NodeyCode): Star<NodeyCode> {
    //otherwise, a normal node with a history
    let nodey = this.store.getLatestOf(unedited) as NodeyCode;
    if (nodey instanceof Star) return nodey;

    //newly entering star state!
    let starNode = this.createStar(nodey) as Star<NodeyCode>;

    // must make the whole chain up Star nodes
    if (starNode.value.parent) {
      console.log("parent is", starNode.value.parent);
      let parent = this.store.getLatestOf(starNode.value.parent);

      let starParent: Star<Nodey>;
      if (parent instanceof Star) starParent = parent as Star<NodeyCode>;
      else starParent = this.markAsEdited(parent);

      //finally, fix pointer names to be stars too
      starNode.value.parent = starParent.name;
      if (starParent.value instanceof NodeyCode) {
        let childIndex = starParent.value.content.indexOf(nodey.name);
        starParent.value.content[childIndex] = starNode.name;
      }
    }

    console.log("STAR NODE", starNode, starNode.value);
    let history = this.store.getHistoryOf(starNode.value);
    history.setLatestToStar(starNode);
    return starNode;
  }

  /*
  * should return if there is any changes to commit true/false
  */
  public commit(
    checkpoint: Checkpoint,
    starCell?: Star<NodeyCell> | NodeyCell
  ): NodeyCell {
    //TODO commit the notebook

    if (starCell) {
      if (starCell instanceof Star) {
        return this.commitCell(starCell, checkpoint.id);
      } else return starCell;
    }
  }

  private commitCell(starCell: Star<NodeyCell>, runId: number) {
    let cell = this.deStar(starCell) as NodeyCell;
    console.log("Cell to commit is " + cell.name, cell, runId);

    if (cell instanceof NodeyCodeCell) {
      let output = this._commitOutput(cell, runId);
      console.log("Output committed", output);
      this._commitCode(cell, runId, output);
      this.store.cleanOutStars(cell);
    }

    return cell;
  }

  private deStar(star: Star<Nodey>) {
    let history = this.store.getHistoryOf(star.value);
    return history.deStar();
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
      let output = this.store.get(out) as NodeyOutput;
      if (oldRun < 0 || output.created === oldRun) {
        return output as NodeyOutput;
      }
    });
    let cell = this.history.notebook.getCellByNode(nodey);
    return NodeyFactory.outputToNodey(
      cell.view.cell as CodeCell,
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
        (child: string | SyntaxToken, index: number) => {
          if (typeof child === "string") {
            let nodeChild = this.store.getLatestOf(child);
            //console.log("child is", child, nodeChild);
            if (nodeChild instanceof Star) {
              let newChild = this.deStar(nodeChild) as NodeyCode;
              output.forEach(out => newChild.addOutput(out));
              newChild.created = runId;

              parentNodey.content[index] = newChild.name;
              newChild.parent = parentNodey.name;
              this._commitCode(newChild, runId, output, prior);
              prior = newChild;
              return newChild.name;
            }

            nodeChild.parent = parentNodey.name;
            if (prior) prior.right = nodeChild.name;
            prior = nodeChild as NodeyCode;
          }

          return child;
        }
      );
  }
}
