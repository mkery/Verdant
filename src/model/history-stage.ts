import {
  Nodey,
  NodeyCode,
  NodeyCell,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook
} from "./nodey";

import { ChangeType } from "./run";

export class HistoryStage {
  // in charge of the stage and commit phases of history
  public clearCellStatus(cell: NodeyCell) {
    var status = cell.cell.status;
    if (status !== ChangeType.REMOVED) cell.cell.clearStatus();
    else {
      cell.cell.dispose();
      cell.cell = null;
      var index = this._cellList.indexOf(cell.id);
      this._cellList.splice(index, 1);
      this._deletedCellList.push(cell.id);
    }
  }

  public markAsEdited(unedited: NodeyCode): NodeyCode {
    if (unedited.id === "*") {
      //already a baby star node. has no history
      return unedited;
    }

    //otherwise, a normal node with a history
    let history = this.getVersionsFor(unedited);
    console.log("history of this node", history, unedited);
    if (!history.starNodey) {
      //newly entering star state!
      let nodey = history.versions[history.versions.length - 1];
      history.starNodey = nodey.clone();
      history.starNodey.version = "*";
      if (history.starNodey.parent) {
        console.log("parent is", history.starNodey.parent, history.starNodey);
        // star all the way up the chain
        let parent = this.getNodeyHead(history.starNodey.parent) as NodeyCode;
        var starParent = this.markAsEdited(parent);

        //finally, fix pointer names to be stars too
        history.starNodey.parent = starParent.name;
        starParent.content[starParent.content.indexOf(nodey.name)] =
          history.starNodey.name;
      }
    }
    return history.starNodey as NodeyCode;
  }

  public addStarNode(starNode: NodeyCode, relativeTo: NodeyCode): string {
    let cell = this.getCellParent(relativeTo);
    console.log("adding star node to", relativeTo, cell, starNode);
    cell.starNodes.push(starNode);
    let num = cell.starNodes.length;
    return cell.id + "." + num;
  }

  public commitChanges(cell: NodeyCell, runId: number) {
    console.log("Cell to commit is " + cell.name, cell, runId);
    if (cell instanceof NodeyCodeCell) {
      let output = this._commitOutput(cell, runId);
      console.log("Output committed", output);
      var newNode = this._commitCode(
        cell,
        runId,
        output,
        this._deStar.bind(this)
      ) as NodeyCodeCell;
      newNode.starNodes = [];
      return newNode;
    } else if (cell instanceof NodeyMarkdown) {
      return this._commitMarkdown(cell, runId);
    }
  }

  private _deStar(nodey: Nodey, runId: number, output: string[]) {
    let newNodey = nodey.clone();
    if (newNodey instanceof NodeyCode && output) {
      output.forEach(out => (newNodey as NodeyCode).addOutput(out));
    }
    newNodey.run.push(runId);
    this.registerNodey(newNodey);
    console.log("star node now ", newNodey);
    return newNodey;
  }

  private _commitMarkdown(nodey: NodeyMarkdown, runId: number) {
    let priorText = nodey.markdown;
    let cell = nodey.cell.cell;
    let score = 0;
    if (cell && cell.model) {
      //cell has not been deleted!
      let newText = cell.model.value.text;
      score = levenshtein.get(priorText, newText);
      if (score > 0) {
        nodey.cell.status = ChangeType.CHANGED;
        let history = this.getVersionsFor(nodey);
        let newNodey = nodey.clone() as NodeyMarkdown;
        newNodey.markdown = newText;
        history.starNodey = newNodey;
        return history.deStar(runId) as NodeyMarkdown;
      }
    }
    if (score === 0) {
      nodey.run.push(runId);
      return nodey;
    }
  }

  private _commitOutput(nodey: NodeyCodeCell, runId: number) {
    let oldOutput = nodey.getOutput();
    let oldRun = -1;
    let old = oldOutput.map(out => {
      let output = this.getOutput(out);
      if (oldRun < 0 || output.run.indexOf(oldRun) > -1) {
        return output;
      }
    });
    return Nodey.outputToNodey(nodey.cell.cell as CodeCell, this, old, runId);
  }

  private _commitCode(
    nodey: NodeyCode,
    runId: number,
    output: string[],
    starFactory: (x: NodeyCode, num: number, out: string[]) => NodeyCode,
    prior: NodeyCode = null
  ): NodeyCode {
    console.log("Commiting code", nodey);
    let newNodey: NodeyCode;
    if (nodey.id === "*") newNodey = starFactory(nodey, runId, output);
    else if (nodey.version === "*") {
      let history = this.getVersionsFor(nodey);
      newNodey = history.deStar(runId, output) as NodeyCode;
    } else {
      output.forEach(out => nodey.addOutput(out));
      return nodey; // nothing to change, stop update here
    }

    if (prior) prior.right = newNodey.name;
    prior = null;

    if (newNodey.content)
      newNodey.content.forEach((childName: any, index: number) => {
        if (!(childName instanceof SyntaxToken)) {
          //skip syntax tokens
          let [id, ver] = childName.split(".");
          let child = this.getNodey(childName) as NodeyCode;
          if (id === "*" || ver === "*") {
            // only update children that are changed
            console.log("getting " + childName, child);
            let newChild = this._commitCode(
              child,
              runId,
              output,
              starFactory,
              prior
            );
            newNodey.content[index] = newChild.name;
            newChild.parent = newNodey.name;
            if (prior) prior.right = newChild.name;
            prior = newChild;
          } else {
            child.run.push(runId);
            child.parent = newNodey.name;
            if (prior) prior.right = child.name;
            prior = child;
          }
        }
      });

    return newNodey;
  }
}
