import { Cell, CodeCell } from "@jupyterlab/cells";

import { OutputArea } from "@jupyterlab/outputarea";

import { PromiseDelegate } from "@phosphor/coreutils";

import { ASTGenerate } from "../analysis/ast-generate";

import { Signal } from "@phosphor/signaling";

import {
  Nodey,
  NodeyCell,
  NodeyCodeCell,
  NodeyOutput,
  NodeyMarkdown
} from "../model/nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "../model/history";

import { ChangeType } from "../model/run";

export abstract class CellListen {
  cell: Cell;
  astUtils: ASTGenerate;
  protected _nodey: number;
  protected _inputSelected = new Signal<this, Nodey>(this);
  protected _outputSelected = new Signal<this, NodeyOutput[]>(this);
  historyModel: HistoryModel;
  status: number;
  position: number;

  constructor(
    cell: Cell,
    astUtils: ASTGenerate,
    historyModel: HistoryModel,
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
    return this.historyModel.getNodeyCell(this._nodey);
  }

  get nodeyName(): string {
    return this.nodey.name;
  }

  get inputSelected(): Signal<CellListen, Nodey> {
    return this._inputSelected;
  }

  get outputSelected(): Signal<CellListen, NodeyOutput[]> {
    return this._outputSelected;
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
    this.listen();
    this._ready.resolve(undefined);
  }

  public cellRun() {
    var node = this.nodey;
    if (node.id === "*" || node.version === "*")
      if (this.status === ChangeType.SAME) this.status = ChangeType.CHANGED;
    this.historyModel.handleCellRun(node);
  }

  protected listen(): void {
    this.cell.inputArea.node.addEventListener("click", () => {
      this._inputSelected.emit(this.nodey);
    });
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
      var nodeyCell = this.historyModel.cellList[
        this.position
      ] as NodeyCodeCell; //TODO could easily fail!!!
      nodeyCell.cell = this;
      this._nodey = nodeyCell.id;
      await this.astUtils.matchASTOnInit(nodeyCell, text);
      //TODO match output too
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

  protected listen(): void {
    super.listen();
    (this.cell as CodeCell).outputArea.node.addEventListener("click", () => {
      this._outputSelected.emit(this.output);
    });

    if (this.cell.editor instanceof CodeMirrorEditor) {
      var editor = <CodeMirrorEditor>this.cell.editor;
      //editor.model.value.changed //listen in
      //editor.model.selections.changed //listen in

      CodeMirror.on(
        editor.doc,
        "change",
        (_: CodeMirror.Editor, change: CodeMirror.EditorChange) => {
          console.log("there was a change!", change, this.nodey);
          this.astUtils.repairAST(<NodeyCodeCell>this.nodey, change, editor);
        }
      );
    }
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
      var nodeyCell = this.historyModel.cellList[
        this.position
      ] as NodeyMarkdown; //TODO could easily fail!!!
      nodeyCell.cell = this;
      this._nodey = nodeyCell.id;
      this.astUtils.repairMarkdown(nodeyCell, this.cell.model.value.text);
    } else {
      var nodey = Nodey.dictToMarkdownNodey(
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
