import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCell,
  NodeyCodeCell,
  NodeyMarkdown,
  SyntaxToken,
  NodeyNotebook,
} from "../../nodey";
import { History } from "..";
import { Checkpoint } from "../../checkpoint";
import { Star, UnsavedStar } from "./star";
import { log } from "../../notebook";

import * as levenshtein from "fast-levenshtein";
import { CodeHistory } from "../store";

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
    if (unedited instanceof NodeyNotebook) return this.markNotebookAsEdited();
    if (unedited instanceof NodeyCode) {
      return this.markCodeAsEdited(unedited);
    }
    if (unedited instanceof NodeyMarkdown) {
      return this.markMarkdownAsEdited(unedited);
    }
  }

  private markNotebookAsEdited(): Star<NodeyNotebook> {
    let notebook = this.history.store.currentNotebook;
    let starNode: Star<NodeyNotebook>;
    if (notebook instanceof Star) {
      starNode = notebook as Star<NodeyNotebook>;
    } else {
      let history = this.store.getHistoryOf(notebook);
      starNode = this.createStar(notebook) as Star<NodeyNotebook>;
      history.setLatestToStar(starNode);
    }
    log(
      "***edited notebook",
      notebook,
      starNode.value.cells.slice(0),
      starNode
    );
    return starNode;
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
      this.markParentAsEdited(starNode, nodey);
    }
    return starNode;
  }

  private markParentAsEdited(starNode: Star<Nodey>, nodey: Nodey) {
    let parent = this.store.getLatestOf(starNode.value.parent);
    let starParent = this.markAsEdited(parent);

    //finally, fix pointer names to be stars too
    starNode.value.parent = starParent.name;
    if (starParent.value instanceof NodeyCode) {
      let childIndex = starParent.value.content.indexOf(nodey.name);
      starParent.value.content[childIndex] = starNode.name;
    } else if (starParent.value instanceof NodeyNotebook) {
      let childIndex = starParent.value.cells.indexOf(nodey.name);
      starParent.value.cells[childIndex] = starNode.name;
    }

    log("***LOOKING FOR CELL", nodey.name, parent);
  }

  public markPendingNewNode(
    nodey: NodeyCode,
    parent: NodeyCode | Star<NodeyCode>
  ): UnsavedStar {
    let nodeyCopy = new NodeyCode(nodey);
    let star = new UnsavedStar(nodeyCopy);
    this.store.storeUnsavedStar(star, parent);
    return star;
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
      this.markParentAsEdited(starNode, nodey);
    }

    let history = this.store.getHistoryOf(starNode.value);
    history.setLatestToStar(starNode);
    return starNode;
  }

  /*
   * should return if there is any changes to commit true/false
   */
  public commit(checkpoint: Checkpoint, starCell?: Star<Nodey> | Nodey): Nodey {
    log("Trying to commit!", starCell);
    if (starCell) {
      if (starCell instanceof Star) {
        if (starCell.value instanceof NodeyNotebook)
          return this.commitNotebook(starCell, checkpoint.id);
        else if (starCell.value instanceof NodeyCodeCell)
          return this.commitCodeCell(starCell, checkpoint.id);
        else if (starCell.value instanceof NodeyMarkdown)
          return this.commitMarkdown(starCell, checkpoint.id);
      } else {
        return starCell;
      }
    }
  }

  public commitDeletedCell(checkpoint: Checkpoint, starCell: Star<NodeyCell>) {
    // destar this cell
    let cell: NodeyCell = this.deStar(starCell, checkpoint.id) as NodeyCodeCell;

    log("Cell to commit is " + cell.name, cell, checkpoint.id);

    // update code nodes and output
    if (cell instanceof NodeyCodeCell) {
      this.commitCode(cell, checkpoint.id);
      this.store.cleanOutStars(cell);
    }

    return cell;
  }

  private commitNotebook(star: Star<Nodey>, eventId: number) {
    let diff = this.verifyDifferent(star);
    log("is different?", diff);
    if (diff) {
      let notebook = this.deStar(star, eventId) as NodeyNotebook;
      notebook.cells.forEach((name, index) => {
        let cell = this.store.get(name);
        if (cell) cell.parent = notebook.name;
        else {
          // cell may not be initialized yet if just added
          log(this.history.notebook.cells);
          // don't worry if cell hasn't been added yet.
          if (this.history.notebook.cells.length > index) {
            let waitCell = this.history.notebook.cells[index];
            waitCell.model.parent = notebook.name;
          }
        }
      });
      return notebook;
    } else return this.discardStar(star);
  }

  private commitCodeCell(starCell: Star<Nodey>, eventId: number) {
    let cell: NodeyCodeCell;
    if (this.verifyDifferent(starCell)) {
      // destar this cell
      cell = this.deStar(starCell, eventId) as NodeyCodeCell;

      // update code nodes and output
      log("Cell to commit is " + cell.name, cell, eventId);
      this.commitCode(cell, eventId);
      this.commitOutput(cell, eventId);
      this.store.cleanOutStars(cell);
    } else {
      // if nothing was changed, nothing was changed
      cell = this.discardStar(starCell) as NodeyCodeCell;

      // check if output should be committed even if code is the same
      this.commitOutput(cell, eventId);
    }

    // update pointer in parent notebook
    this.postCommit_updateParent(cell, starCell);
    return cell;
  }

  private deStar(star: Star<Nodey>, eventId: number) {
    let newNode: Nodey;
    if (star instanceof UnsavedStar) {
      log("MUST SAVE UNSAVED STAR", star);
      newNode = star.value;
      this.store.store(newNode);
    } else {
      let history = this.store.getHistoryOf(star.value);
      newNode = history.deStar();
    }
    newNode.created = eventId;
    log("DESTARRED", star, newNode);
    return newNode;
  }

  private discardStar(star: Star<Nodey>) {
    let history = this.store.getHistoryOf(star.value);
    // check: if the star has children, make sure their stars
    // are discared too
    if (star.value instanceof NodeyCode) {
      if (star.value.content)
        star.value.content.forEach((name) => {
          if (typeof name == "string") {
            let nodey = this.store.getLatestOf(name);
            if (nodey instanceof Star) this.discardStar(nodey);
          }
        });
    }

    return history.discardStar();
  }

  private commitMarkdown(star: Star<Nodey>, eventId: number) {
    let nodey = star as Star<NodeyMarkdown>;

    let updatedNodey: NodeyMarkdown;
    if (this.verifyDifferent(nodey)) {
      updatedNodey = this.deStar(nodey, eventId) as NodeyMarkdown;
    } else {
      /*
       * if nothing was changed, nothing was changed
       * this protects us against undo and changes that result
       * in no real change to the text
       */
      updatedNodey = this.discardStar(star) as NodeyMarkdown;
    }

    this.postCommit_updateParent(updatedNodey, nodey);
    return updatedNodey;
  }

  private postCommit_updateParent(updatedNodey: NodeyCell, star: Star<Nodey>) {
    // update pointer in parent notebook
    let parent = this.store.getLatestOf(updatedNodey.parent);
    log("update parent notebook for ", updatedNodey, parent);

    if (parent instanceof Star && parent.value instanceof NodeyNotebook) {
      let index = parent.value.cells.indexOf(star.name);
      parent.value.cells[index] = updatedNodey.name;
    } else if (parent instanceof NodeyNotebook) {
      let index = parent.cells.indexOf(star.name);
      parent.cells[index] = updatedNodey.name;
      updatedNodey.parent = parent.name;
    }

    //log("UPDATED PARENT", index, parent.value.cells, star.name);
  }

  private verifyDifferent(nodey: Star<Nodey>): boolean {
    // check the last non-star version of this node
    let lastSave = this.store.getHistoryOf(nodey.value).lastSaved;

    if (nodey.value instanceof NodeyNotebook) {
      /* for a notebook just check if any of the cells have
       * actually changed
       */
      let cellCount =
        (lastSave as NodeyNotebook).cells.length !==
        (nodey.value as NodeyNotebook).cells.length;
      return (
        cellCount ||
        !(lastSave as NodeyNotebook).cells.every(
          (name, index) => name === (nodey.value as NodeyNotebook).cells[index]
        )
      );
    } else {
      /*
       * for most cells, check if the text content is different
       */
      let priorText: string;

      if (lastSave instanceof NodeyMarkdown) priorText = lastSave.markdown;
      else if (lastSave instanceof NodeyCode)
        priorText = this.history.inspector.renderNode(lastSave);

      // now check the current value of this markdown node
      let cell = this.history.notebook.getCellByNode(nodey);
      let newText = cell.view.model.value.text;
      if (priorText && newText) return levenshtein.get(priorText, newText) > 0;
      else return priorText !== newText;
    }
  }

  public commitOutput(nodeyCodeCell: NodeyCodeCell, eventId: number): void {
    const cell = this.history.notebook.getCellByNode(nodeyCodeCell);
    if (cell.outputArea) {
      let history = this.history.store.getOutput(nodeyCodeCell);
      console.log("DOES THIS CELL HAVE OUTPUT?", nodeyCodeCell, history);
      let raw = cell.outputArea.model.toJSON();

      // don't commit output that's empty unless the output before wasn't empty
      if (history || raw.length > 0) {
        /*
         * verify different
         */
        let same = false;
        let oldOutput;
        if (history) {
          oldOutput = history.lastSaved as NodeyOutput;
          same = NodeyOutput.equals(raw, oldOutput.raw);
          log("SAME OUTPUT?", same, raw, oldOutput.raw);
        }
        if (!same) {
          // make a new output
          var n = new NodeyOutput({
            raw: raw,
            created: eventId,
            parent: nodeyCodeCell.name,
          });
          if (!history) {
            // create a new output store since this cell doesn't have one
            this.history.store.store(n);
            // finally record the new output with the code cell
            let cellHistory = this.store.getHistoryOf(
              nodeyCodeCell
            ) as CodeHistory;
            cellHistory.addOutput(nodeyCodeCell.version, n);
          } else {
            // or add output to existing cell output history
            let ver = history.addVersion(n) - 1;
            n.version = ver;
            n.id = oldOutput.id;
          }

          log("Commiting output", n);
        }
      }
    }
  }

  private commitCode(
    parentNodey: NodeyCode,
    eventId: number,
    prior: NodeyCode = null
  ) {
    if (prior) prior.right = parentNodey.name;
    prior = null;

    if (parentNodey.content)
      parentNodey.content = parentNodey.content.map(
        (child: string | SyntaxToken, index: number) => {
          if (typeof child === "string") {
            let nodeChild = this.store.getLatestOf(child);
            if (nodeChild instanceof Star) {
              let newChild = this.deStar(nodeChild, eventId) as NodeyCode;
              newChild.created = eventId;

              parentNodey.content[index] = newChild.name;
              newChild.parent = parentNodey.name;
              this.commitCode(newChild, eventId, prior);
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
