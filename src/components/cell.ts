import {
  NodeyCell,
  NodeyOutput,
  NodeyMarkdown,
  NodeyCodeCell
} from "../model/nodey";
import { PromiseDelegate } from "@phosphor/coreutils";
import {
  CellListen,
  CodeCellListen,
  MarkdownCellListen
} from "../jupyter-hooks/cell-listen";
import { VerNotebook } from "./notebook";
import { NodeyFactory } from "../model/nodey-factory";
import { Cell, CodeCell, MarkdownCell } from "@jupyterlab/cells";

export class VerCell {
  constructor(
    notebook: VerNotebook,
    cell: Cell,
    index: number,
    matchPrior: boolean
  ) {
    this.notebook = notebook;
    this.position = index;
    this.view = this.createCellListen(cell);
    this.init(matchPrior);
  }

  private position: number;
  readonly view: CellListen;
  private modelName: string;
  private readonly notebook: VerNotebook;

  private async init(matchPrior: boolean) {
    if (this.view instanceof CodeCellListen)
      await this.initCodeCell(matchPrior);
    else if (this.view instanceof MarkdownCellListen)
      await this.initMarkdownCell(matchPrior);
    this._ready.resolve(undefined);
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  get model(): NodeyCell {
    return this.notebook.history.get(this.modelName) as NodeyCell;
  }

  get output(): NodeyOutput[] {
    var output = (this.model as NodeyCodeCell).output;
    if (output)
      return output.map(o => {
        return this.notebook.history.get(o) as NodeyOutput;
      });
  }

  public async run() {
    let text: string = "";
    // check cell wasn't just deleted
    if (this.view.cell.inputArea) text = this.view.cell.editor.model.value.text;
    await this.notebook.ast.repairFullAST(this.model, text);
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

  private createCellListen(cell: Cell) {
    var cellListen: CellListen;
    if (cell instanceof CodeCell) cellListen = new CodeCellListen(cell, this);
    else if (cell instanceof MarkdownCell)
      cellListen = new MarkdownCellListen(cell, this);
    return cellListen;
  }

  private async initCodeCell(matchPrior: boolean) {
    var cell = this.view.cell as CodeCell;
    var text: string = cell.editor.model.value.text;
    if (matchPrior) {
      let name = this.notebook.model.cells[this.position]; //TODO could easily fail!!!
      var nodeyCell = this.notebook.history.get(name);
      if (nodeyCell instanceof NodeyCodeCell) {
        let nodey = await this.notebook.ast.matchASTOnInit(nodeyCell, text);
        this.modelName = nodey.name;
        //TODO match output too
      } else if (nodeyCell instanceof NodeyMarkdown) {
        var output = NodeyFactory.outputToNodey(
          cell,
          this.notebook.history.store
        );
        let nodey = await this.notebook.ast.markdownToCodeNodey(
          nodeyCell,
          text,
          this.position
        );
        nodey.output = nodey.output.concat(output);
        this.modelName = nodey.name;
      }
    } else {
      var output = NodeyFactory.outputToNodey(
        cell,
        this.notebook.history.store
      );
      let nodey = await this.notebook.ast.generateCodeNodey(
        text,
        this.position
      );
      nodey.output = nodey.output.concat(output);
      this.modelName = nodey.name;
      console.log("created Output!", output, nodey);
    }
  }

  private async initMarkdownCell(matchPrior: boolean) {
    if (matchPrior) {
      let name = this.notebook.model.cells[this.position]; //TODO could easily fail!!!
      var nodeyCell = this.notebook.history.get(name);
      //console.log("Prior match is", nodeyCell, this.position);
      if (nodeyCell instanceof NodeyMarkdown) {
        this.modelName = nodeyCell.name;
        await this.notebook.ast.repairMarkdown(
          nodeyCell,
          this.view.cell.model.value.text
        );
      } else if (nodeyCell instanceof NodeyCodeCell) {
        var nodey = await NodeyFactory.dictToMarkdownNodey(
          this.view.cell.model.value.text,
          this.position,
          this.notebook.history.store,
          this.view,
          nodeyCell.name
        );
      }
    } else {
      var nodey = await NodeyFactory.dictToMarkdownNodey(
        this.view.cell.model.value.text,
        this.position,
        this.notebook.history.store,
        this.view
      );
    }
    this.modelName = nodey.name;
  }

  private _ready = new PromiseDelegate<void>();
}
