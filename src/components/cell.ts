import {
  NodeyCell,
  NodeyOutput,
  NodeyMarkdown,
  NodeyCodeCell
} from "../model/nodey";
import { PromiseDelegate } from "@phosphor/coreutils";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerNotebook } from "./notebook";
import { Checkpoint } from "../model/checkpoint";
import { Cell, CodeCell, MarkdownCell } from "@jupyterlab/cells";
import { Star } from "../model/history-stage";

export class VerCell {
  constructor(
    notebook: VerNotebook,
    cell: Cell,
    index: number,
    matchPrior: boolean,
    checkpoint: Checkpoint // what event created this cell?
  ) {
    this.notebook = notebook;
    this.position = index;
    this.view = cell;
    this.init(matchPrior, checkpoint);
  }

  private position: number;
  readonly view: Cell;
  private modelName: string;
  private readonly notebook: VerNotebook;

  private async init(matchPrior: boolean, checkpoint: Checkpoint) {
    if (this.view instanceof CodeCell)
      await this.initCodeCell(matchPrior, checkpoint);
    else if (this.view instanceof MarkdownCell)
      await this.initMarkdownCell(matchPrior, checkpoint);
    this.listen();
    this._ready.resolve(undefined);
  }

  public get ready(): Promise<void> {
    return this._ready.promise;
  }

  public get model(): NodeyCell | Star<NodeyCell> {
    return this.notebook.history.store.getLatestOf(this.modelName);
  }

  public get lastSavedModel(): NodeyCell {
    return this.notebook.history.store.getHistoryOf(this.modelName).lastSaved;
  }

  public get currentIndex(): number {
    return this.notebook.cells.findIndex(item => item === this);
  }

  public get output(): NodeyOutput {
    var output = (this.model as NodeyCodeCell).output;
    if (output) return this.notebook.history.store.get(output) as NodeyOutput;
  }

  public get outputArea(): OutputArea {
    if (this.view instanceof CodeCell)
      return (this.view as CodeCell).outputArea;
  }

  public async repair() {
    let text: string = "";
    // check cell wasn't just deleted
    if (this.view.inputArea) {
      text = this.view.editor.model.value.text;
    }
    await this.notebook.ast.repairFullAST(this.model, text);
  }

  public async repairAndCommit(
    checkpoint: Checkpoint
  ): Promise<[NodeyCell, boolean]> {
    // repair the cell against the prior version
    await this.repair();
    let nodey = this.model;

    // commit the cell if it has changed
    let newNodey = this.notebook.history.stage.commit(checkpoint, nodey);

    let same = newNodey.name === nodey.name;

    return [newNodey, same];
  }

  public async added() {
    //TODO
  }

  public async deleted() {
    //TODO
  }

  public async cellTypeChanged() {
    //TODO
  }

  private async initCodeCell(matchPrior: boolean, checkpoint: Checkpoint) {
    var cell = this.view as CodeCell;

    var text: string = cell.editor.model.value.text;
    if (matchPrior) {
      let name = this.notebook.cells[this.position].model.name;
      var nodeyCell = this.notebook.history.store.get(name);
      if (nodeyCell instanceof NodeyCodeCell) {
        let nodey = await this.notebook.ast.matchASTOnInit(nodeyCell, text);
        this.modelName = nodey.name;
        // TODO figure out event if it's NOT the same
        // TODO match output too
      } else if (nodeyCell instanceof NodeyMarkdown) {
        let nodey = await this.notebook.ast.markdownToCodeNodey(
          nodeyCell,
          text,
          this.position
        );

        var output = this.notebook.history.stage.commitOutput(
          nodey as NodeyCodeCell,
          checkpoint.id,
          this
        );
        nodey.output = output.name;
        this.modelName = nodey.name;
      }
    } else {
      let nodey = await this.notebook.ast.generateCodeNodey(
        text,
        this.position
      );
      nodey.created = checkpoint.id;
      var output = this.notebook.history.stage.commitOutput(
        nodey as NodeyCodeCell,
        checkpoint.id,
        this
      );
      nodey.output = output.name;
      this.modelName = nodey.name;
    }
  }

  private async initMarkdownCell(matchPrior: boolean, checkpoint: Checkpoint) {
    let nodey: NodeyMarkdown;
    if (matchPrior) {
      // TODO figure out event if it's NOT the same
      let name = this.notebook.cells[this.position].model.name; //TODO could easily fail!!!
      var nodeyCell = this.notebook.history.store.get(name);
      //console.log("Prior match is", nodeyCell, this.position);
      if (nodeyCell instanceof NodeyMarkdown) {
        await this.notebook.ast.repairMarkdown(
          nodeyCell,
          this.view.model.value.text
        );
      } else if (nodeyCell instanceof NodeyCodeCell) {
        let text = this.view.model.value.text;
        nodey = new NodeyMarkdown({ markdown: text, created: checkpoint.id });
        this.notebook.history.store.registerTiedNodey(nodey, nodeyCell.name);
      }
    } else {
      let text = this.view.model.value.text;
      nodey = new NodeyMarkdown({ markdown: text, created: checkpoint.id });
      this.notebook.history.store.store(nodey);
    }
    this.modelName = nodey.name;
  }

  private listen() {
    this.view.model.contentChanged.connect(() => {
      /* set model of this cell to star state, although we
       * don't know for sure yet, because of possible undo,
       * if anything has truly changed yet
       */
      this.notebook.history.stage.markAsEdited(this.model);
    });
  }

  private _ready = new PromiseDelegate<void>();
}
