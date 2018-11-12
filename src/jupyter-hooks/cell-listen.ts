import { Cell, CodeCell } from "@jupyterlab/cells";

import { OutputArea } from "@jupyterlab/outputarea";

import { PromiseDelegate } from "@phosphor/coreutils";

import { ASTGenerate } from "../analysis/ast-generate";

import {
  Nodey,
  NodeyCell,
  NodeyCodeCell,
  NodeyOutput,
  NodeyMarkdown
} from "../model/nodey";

import { NodeyFactory } from "../model/nodey-factory";

//import * as CodeMirror from "codemirror";

//import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { History } from "../model/history";

import { ChangeType } from "../model/checkpoint";

export abstract class CellListen {
  cell: Cell;
  astUtils: ASTGenerate;
  protected _nodey: string;
  historyModel: History;
  status: number;
  position: number;

  constructor(
    cell: Cell,
    astUtils: ASTGenerate,
    historyModel: History,
    position: number,
    matchPrior: boolean
  ) {
    this.cell = cell;
    this.astUtils = astUtils;
    this.historyModel = historyModel;
    this.position = position;
    this.status = ChangeType.SAME;
    this.init(matchPrior);
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  get nodey(): NodeyCell {
    return this.historyModel.get(this._nodey) as NodeyCell;
  }

  get nodeyName(): string {
    return this.nodey.name;
  }

  public clearStatus(): void {
    this.status = ChangeType.SAME;
  }

  /**
   * Dispose of the resources held by the model.
   */
  public dispose(): void {
    this.cell = null;
  }

  public focus(): void {}

  public blur(): void {}

  protected async init(_: boolean): Promise<void> {
    this._ready.resolve(undefined);
  }

  public cellRun() {
    var node = this.nodey;
    this.historyModel.handleCellRun(node);
  }

  protected _ready = new PromiseDelegate<void>();
}

/*
*
*  Cell listen for code cells
*
*/
export class CodeCellListen extends CellListen {
  protected async init(matchPrior: boolean) {
    var cell = this.cell as CodeCell;
    var text: string = cell.editor.model.value.text;
    if (matchPrior) {
      var nodeyCell = this.historyModel.cellList[this.position]; //TODO could easily fail!!!
      if (nodeyCell instanceof NodeyCodeCell) {
        nodeyCell.cell = this;
        this._nodey = nodeyCell.id;
        await this.astUtils.matchASTOnInit(nodeyCell, text);
        //TODO match output too
      } else if (nodeyCell instanceof NodeyMarkdown) {
        var output = NodeyFactory.outputToNodey(cell, this.historyModel.st);
        let nodey = await this.astUtils.markdownToCodeNodey(
          nodeyCell,
          text,
          this.position
        );
        nodey.output = nodey.output.concat(output);
        (nodey as NodeyCodeCell).cell = this;
        this._nodey = nodey.id;
      }
    } else {
      var output = Nodey.outputToNodey(cell, this.historyModel);
      let nodey = await this.astUtils.generateCodeNodey(text, this.position);
      nodey.output = nodey.output.concat(output);
      (nodey as NodeyCodeCell).cell = this;
      this._nodey = nodey.id;
      console.log("created Output!", output, nodey);
    }

    super.init(matchPrior);
  }

  public get output(): NodeyOutput[] {
    var output = (this.nodey as NodeyCodeCell).output;
    if (output)
      return output.map(o => {
        return this.historyModel.getOutput(o);
      });
  }

  public get outputArea(): OutputArea {
    return (this.cell as CodeCell).outputArea;
  }

  public async cellRun() {
    let text: string = "";
    // check cell wasn't just deleted
    if (this.cell.inputArea) text = this.cell.editor.model.value.text;
    else this.status = ChangeType.REMOVED;
    let editedNode = (await this.astUtils.repairFullAST(
      <NodeyCodeCell>this.nodey,
      text
    )) as NodeyCodeCell;

    if (editedNode.id === "*" || editedNode.version === "*")
      if (this.status === ChangeType.SAME) this.status = ChangeType.CHANGED;

    this.historyModel.handleCellRun(editedNode);
  }
}

/*
  *
  *  Cell listen for code cells
  *
  */
export class MarkdownCellListen extends CellListen {
  protected async init(matchPrior: boolean) {
    if (matchPrior) {
      var nodeyCell = this.historyModel.cellList[this.position]; //TODO could easily fail!!!
      //console.log("Prior match is", nodeyCell, this.position);
      if (nodeyCell instanceof NodeyMarkdown) {
        nodeyCell.cell = this;
        this._nodey = nodeyCell.id;
        await this.astUtils.repairMarkdown(
          nodeyCell,
          this.cell.model.value.text
        );
      } else if (nodeyCell instanceof NodeyCodeCell) {
        var nodey = await NodeyFactory.dictToMarkdownNodey(
          this.cell.model.value.text,
          this.position,
          this.historyModel,
          this,
          nodeyCell.name
        );
        this._nodey = nodey.id;
      }
    } else {
      var nodey = await NodeyFactory.dictToMarkdownNodey(
        this.cell.model.value.text,
        this.position,
        this.historyModel,
        this
      );
      this._nodey = nodey.id;
    }
    super.init(matchPrior);
  }
}
