import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyRawCell,
  NodeyCell,
} from "../../nodey";
import { History } from "..";
import { Checkpoint } from "../../checkpoint";
import { CodeHistory } from "../store";

export class HistoryStage {
  readonly history: History;

  private dirty_nodey: string[];
  private added_cells: { addedCell: NodeyCell; index: number }[];
  private deleted_cells: NodeyCell[];
  private moved_cells: { cell: NodeyCell; index: number }[];
  private type_changed_cells: { oldCell: NodeyCell; newCell: NodeyCell }[];
  private staged_codeCell: {};
  private staged_markdown: { [cellName: string]: { markdown: string } };
  private staged_rawCell: { [cellName: string]: { literal: string } };

  constructor(history: History) {
    this.history = history;
    this.clearStaging();
  }

  public markAsEdited(unedited: Nodey): void {
    this.dirty_nodey.push(unedited.name);
  }

  public markCellAsAdded(added: NodeyCell, index: number): void {
    this.added_cells.push({ addedCell: added, index });
  }

  public markCellAsDeleted(deleted: NodeyCell): void {
    this.deleted_cells.push(deleted);
  }

  public markCellAsMoved(moved: NodeyCell, newPos: number): void {
    this.moved_cells.push({ cell: moved, index: newPos });
  }

  public markCellTypeAsChanged(oldCell: NodeyCell, newCell: NodeyCell): void {
    this.type_changed_cells.push({ oldCell, newCell });
  }

  /*
   * 1) Take a look at the dirty node list, which are potentially changed nodey
   * 2) Verify that each node is actually changed
   * 3) If so, mark a new version of that node and and update its parent nodes recursively
   * 3a) Don't store the new version of the node right away: since many nodes share
   * the same parents, we need to keep track of all the new node versions from this commit
   * so that we don't accidentally contaminate the history store
   * 4) Once the dirty node list is cleared, store everything in the staged node list
   * 5) return a copy of the staged nodey list and then reset the staged node list to empty
   */
  public commit(checkpoint: Checkpoint): Nodey[] {
    // create staging lists
    this.dirty_nodey.forEach((name: string) => {
      // get potentially dirty nodey
      let nodey = this.history.store.get(name);

      if (nodey instanceof NodeyCode) {
        let nodeyCell;
        if (nodey instanceof NodeyCodeCell) nodeyCell = nodey;
        else nodeyCell = this.history.store.getCellParent(nodey);
        this.checkCodeCellNodey(nodeyCell);
        this.checkOutputNodey(nodeyCell);
      } else if (nodey instanceof NodeyMarkdown) {
        this.checkMarkdownNodey(nodey);
      } else if (nodey instanceof NodeyRawCell) {
        this.checkRawCellNodey(nodey);
      }
    });

    let isEdited = this.isEdited();
    let changedNodey: Nodey[] = [];
    // see if anything is changed
    if (
      isEdited ||
      this.added_cells.length > 0 ||
      this.deleted_cells.length > 0 ||
      this.moved_cells.length > 0 ||
      this.type_changed_cells.length > 0
    ) {
      // create a new notebook version for these new updates
      let newNotebook = this.createNotebookVersion(checkpoint);

      // now create and store new versions for everything staged
      if (isEdited)
        changedNodey.push(...this.commitStaged(newNotebook, checkpoint));

      // move any cells staged for moving
      let cells = newNotebook.cells;
      this.moved_cells.forEach((m) => {
        let name = m.cell.name;
        changedNodey.push(m.cell);
        let i = cells.indexOf(name);
        if (i > -1) cells.splice(i, 1); // delete the pointer
        cells.splice(m.index, 0, name); // re-add in correct place
      });

      // now delete any cells staged for deletion
      cells = newNotebook.cells;
      this.deleted_cells.forEach((d) => {
        let name = d.name;
        changedNodey.push(d);
        let i = cells.indexOf(name);
        if (i > -1) cells.splice(i, 1); // delete the pointer
      });
      newNotebook.cells = cells;

      // now add any cells staged for addition
      cells = newNotebook.cells;
      this.added_cells.forEach((a) => {
        // make sure new cell's parent is this newNotebook
        a.addedCell.parent = newNotebook.name;
        let name = a.addedCell.name;
        changedNodey.push(a.addedCell);
        cells.splice(a.index, 0, name);
      });
      newNotebook.cells = cells;

      // switch cells who's type changed
      cells = newNotebook.cells;
      this.type_changed_cells.forEach((a) => {
        // make sure new cell's parent is this newNotebook
        a.newCell.parent = newNotebook.name;
        let oldName = a.oldCell.name;
        let newName = a.newCell.name;
        changedNodey.push(a.newCell);
        let i = cells.indexOf(oldName);
        if (i > -1) cells.splice(i, 1, newName);
      });
      newNotebook.cells = cells;
    }

    // finally clear staging to end turn
    this.clearStaging();
    return changedNodey;
  }

  private isEdited() {
    let codeCells = Object.keys(this.staged_codeCell);
    let markdownCells = Object.keys(this.staged_markdown);
    let rawCells = Object.keys(this.staged_rawCell);
    return codeCells.length + markdownCells.length + rawCells.length > 0;
  }

  private clearStaging() {
    this.dirty_nodey = [];
    this.added_cells = [];
    this.deleted_cells = [];
    this.moved_cells = [];
    this.staged_codeCell = {};
    this.staged_markdown = {};
    this.staged_rawCell = {};
    this.type_changed_cells = [];
  }

  private commitStaged(
    newNotebook: NodeyNotebook,
    checkpoint: Checkpoint
  ): Nodey[] {
    let newNodey: Nodey[] = [];

    // now go through an update existing cells
    newNotebook.cells = newNotebook.cells.map((c) => {
      let cell = this.history.store.get(c);
      if (
        cell instanceof NodeyCodeCell &&
        this.staged_codeCell[cell.artifactName]
      ) {
        // create new version of code cell
        let instructions = this.staged_codeCell[cell.artifactName];
        let [newCell, newOtherNodey] = this.createCodeCellVersion(
          cell.artifactName,
          instructions,
          newNotebook,
          checkpoint
        );
        newNodey.push(newCell);
        newNodey.push(...newOtherNodey);
        return newCell.name;
      } else if (
        cell instanceof NodeyMarkdown &&
        this.staged_markdown[cell.artifactName]
      ) {
        // new version of markdown cell
        let instructions = this.staged_markdown[cell.artifactName];
        let newCell = this.createMarkdownVersion(
          cell.artifactName,
          instructions,
          newNotebook,
          checkpoint
        );
        newNodey.push(newCell);
        return newCell.name;
      } else if (
        cell instanceof NodeyRawCell &&
        this.staged_rawCell[cell.artifactName]
      ) {
        // new version of raw cell
        let instructions = this.staged_rawCell[cell.artifactName];
        let newCell = this.createRawCellVersion(
          cell.artifactName,
          instructions,
          newNotebook,
          checkpoint
        );
        newNodey.push(newCell);
        return newCell.name;
      }
      // otherwise assume this cell is unchanged in this commit
      return c;
    });

    return newNodey;
  }

  private checkCodeCellNodey(nodey: NodeyCodeCell) {
    let cell = this.history.notebook.getCellByNode(nodey);
    let newText = cell.getText();
    // TODO AST LEVEL
    let oldText = nodey.literal; // assuming no AST level data
    if (oldText != newText) {
      // store instructions for a new version of nodey in staging
      if (!this.staged_codeCell[nodey.artifactName])
        this.staged_codeCell[nodey.artifactName] = { literal: newText };
      this.staged_codeCell[nodey.artifactName]["literal"] = newText;
    }
  }

  private checkOutputNodey(nodey: NodeyCodeCell) {
    // get current (new) output if any
    let cell = this.history.notebook.getCellByNode(nodey);
    let outputArea = cell.outputArea;
    let raw = []; // no output
    if (outputArea) raw = cell.outputArea.model.toJSON(); // output if present

    // get prior output if any
    let oldOutput = cell.output;
    let oldRaw = [];
    if (oldOutput) {
      oldRaw = oldOutput.raw;
    }

    // compare to see if output has changed
    let changed = JSON.stringify(raw) != JSON.stringify(oldRaw);
    if (changed) {
      // make instructions for a new Output in staging
      if (!this.staged_codeCell[nodey.artifactName])
        this.staged_codeCell[nodey.artifactName] = {};
      this.staged_codeCell[nodey.artifactName]["output"] = raw;
    }
  }

  private checkMarkdownNodey(nodey: NodeyMarkdown) {
    let cell = this.history.notebook.getCellByNode(nodey);
    let newText = cell.getText();
    let oldText = nodey.markdown;
    if (oldText != newText) {
      // store instructions for a new version of nodey in staging
      if (!this.staged_markdown[nodey.artifactName])
        this.staged_markdown[nodey.artifactName] = { markdown: newText };
      else this.staged_markdown[nodey.artifactName]["markdown"] = newText;
    }
  }

  private checkRawCellNodey(nodey: NodeyRawCell) {
    let cell = this.history.notebook.getCellByNode(nodey);
    let newText = cell.getText();
    let oldText = nodey.literal;
    if (oldText != newText) {
      // store instructions for a new version of nodey in staging
      if (!this.staged_rawCell[nodey.artifactName])
        this.staged_rawCell[nodey.artifactName] = { literal: newText };
      else this.staged_rawCell[nodey.artifactName]["literal"] = newText;
    }
  }

  private createNotebookVersion(checkpoint: Checkpoint) {
    let oldNotebook = this.history.store.currentNotebook;
    let newNotebook = new NodeyNotebook({
      id: oldNotebook.id,
      created: checkpoint.id,
      cells: oldNotebook.cells.splice(0),
    });
    let notebookHist = this.history.store.getHistoryOf(oldNotebook);
    notebookHist.addVersion(newNotebook);
    return newNotebook;
  }

  private createMarkdownVersion(
    artifactName: string,
    instructions: { markdown: string },
    notebook: NodeyNotebook,
    checkpoint: Checkpoint
  ): NodeyMarkdown {
    let nodeyHistory = this.history.store.getHistoryOf(artifactName);
    let oldNodey = nodeyHistory.latest;
    let newNodey = new NodeyMarkdown({
      id: oldNodey.id,
      created: checkpoint.id,
      markdown: instructions.markdown,
      parent: notebook.name,
    });
    nodeyHistory.addVersion(newNodey);
    return newNodey;
  }

  private createRawCellVersion(
    artifactName: string,
    instructions: { literal: string },
    notebook: NodeyNotebook,
    checkpoint: Checkpoint
  ): NodeyRawCell {
    let nodeyHistory = this.history.store.getHistoryOf(artifactName);
    let oldNodey = nodeyHistory.latest;
    let newNodey = new NodeyRawCell({
      id: oldNodey.id,
      created: checkpoint.id,
      literal: instructions.literal,
      parent: notebook.name,
    });
    nodeyHistory.addVersion(newNodey);
    return newNodey;
  }

  private createCodeCellVersion(
    artifactName: string,
    instructions: { [key: string]: any },
    notebook: NodeyNotebook,
    checkpoint: Checkpoint
  ): [NodeyCodeCell, Nodey[]] {
    // build base code cell
    let nodeyHistory = this.history.store.getHistoryOf(
      artifactName
    ) as CodeHistory;
    let oldNodey = nodeyHistory.latest;
    let newNodey;
    let newOtherNodey: Nodey[] = []; // for new snippets and output

    // check do we need a new cell version other than output?
    if (instructions["literal"] || instructions["content"]) {
      newNodey = new NodeyCodeCell({
        id: oldNodey.id,
        created: checkpoint.id,
        literal: instructions["literal"],
        parent: notebook.name,
      });
      nodeyHistory.addVersion(newNodey);
    } else newNodey = oldNodey;

    // now check if there is output to build
    if (instructions["output"]) {
      // see if we already have an output history to add to
      let oldOutputHist = this.history.store.getOutput(newNodey);
      if (oldOutputHist) {
        let oldOut = oldOutputHist.latest;
        let newOut = new NodeyOutput({
          id: oldOut.id,
          created: checkpoint.id,
          parent: newNodey.name,
          raw: instructions["output"],
        });
        oldOutputHist.addVersion(newOut);
        newOtherNodey.push(newOut);
      } else {
        // if there is no output history, create a new one
        // but only if raw is not empty
        if (instructions["output"].length > 0) {
          let newOut = new NodeyOutput({
            created: checkpoint.id,
            parent: newNodey.name,
            raw: instructions["output"],
          });
          this.history.store.store(newOut);
          nodeyHistory.addOutput(newNodey.version, newOut);
          newOtherNodey.push(newOut);
        }
      }
    }

    return [newNodey, newOtherNodey];
  }
}
