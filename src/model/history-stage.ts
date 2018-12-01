import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  SyntaxToken,
  NodeyNotebook
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

  get version(): string {
    return "*";
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

  public markAsEdited(unedited: Nodey | Star<Nodey>): Star<Nodey> {
    if (unedited instanceof Star) return unedited;
    if (unedited instanceof NodeyCode) {
      if (unedited instanceof NodeyCodeCell) this.markNotebookAsEdited();
      return this.markCodeAsEdited(unedited);
    } else if (unedited instanceof NodeyMarkdown) {
      return this.markMarkdownAsEdited(unedited);
    }
  }

  private markNotebookAsEdited(): void {
    let notebook = this.history.store.currentNotebook;
    console.log("Notebook is", notebook, this.history.notebook);
    let starNode: Star<NodeyNotebook>;
    if (notebook instanceof Star) {
      starNode = notebook as Star<NodeyNotebook>;
    } else {
      let history = this.store.getHistoryOf(notebook);
      starNode = this.createStar(notebook) as Star<NodeyNotebook>;
      history.setLatestToStar(starNode);
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
      this.markNotebookAsEdited();
    }
    return starNode;
  }

  private createStar(nodey: Nodey) {
    let starNode;
    if (nodey instanceof NodeyNotebook) {
      let nodeyCopy = new NodeyNotebook(nodey as NodeyNotebook);
      starNode = new Star<NodeyNotebook>(nodeyCopy);
    } else if (nodey instanceof NodeyMarkdown) {
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
  public commit(checkpoint: Checkpoint, starCell?: Star<Nodey> | Nodey): Nodey {
    if (starCell) {
      if (starCell instanceof Star) {
        if (starCell.value instanceof NodeyNotebook)
          return this.commitNotebook(starCell, checkpoint.id);
        else if (starCell.value instanceof NodeyCodeCell)
          return this.commitCodeCell(starCell, checkpoint.id);
        else if (starCell.value instanceof NodeyMarkdown)
          return this.commitMarkdown(starCell, checkpoint.id);
      } else return starCell;
    }
  }

  private commitNotebook(star: Star<Nodey>, eventId: number) {
    return this.deStar(star, eventId) as NodeyNotebook;
  }

  private commitCodeCell(starCell: Star<Nodey>, eventId: number) {
    let cell = this.deStar(starCell, eventId) as NodeyCodeCell;
    console.log("Cell to commit is " + cell.name, cell, eventId);
    let output = this.commitOutput(cell, eventId);
    console.log("Output committed", output);
    this.commitCode(cell, eventId, output);
    this.store.cleanOutStars(cell);
    return cell;
  }

  private deStar(star: Star<Nodey>, eventId: number) {
    let history = this.store.getHistoryOf(star.value);
    let newNode = history.deStar();
    newNode.created = eventId;
    return newNode;
  }

  private commitMarkdown(nodey: Star<Nodey>, eventId: number) {
    console.error("TODO", nodey, eventId);
    return nodey.value;
    /*let priorText = nodey.markdown;
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
        newCell.created = eventId;
        return history.deStar(eventId) as NodeyMarkdown;
      }
    }
    if (score === 0) {
      nodey.run.push(eventId);
      return nodey;
    }*/
  }

  private commitOutput(nodey: NodeyCodeCell, eventId: number) {
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
      cell.view as CodeCell,
      this.store,
      old,
      eventId
    );
  }

  private commitCode(
    parentNodey: NodeyCode,
    eventId: number,
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
              let newChild = this.deStar(nodeChild, eventId) as NodeyCode;
              output.forEach(out => newChild.addOutput(out));
              newChild.created = eventId;

              parentNodey.content[index] = newChild.name;
              newChild.parent = parentNodey.name;
              this.commitCode(newChild, eventId, output, prior);
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
