import { Cell, CodeCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@phosphor/coreutils";

import { ASTGenerate } from "./ast-generate";

import {
  Nodey,
  NodeyOutput,
  NodeyCell,
  NodeyCodeCell,
  NodeyMarkdown
} from "./nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "./history-model";

import { IChangedArgs } from "@jupyterlab/coreutils";

import { ChangeType } from "./run";

export abstract class CellListen {
  cell: Cell;
  astUtils: ASTGenerate;
  protected _nodey: number;
  historyModel: HistoryModel;
  status: number;

  constructor(cell: Cell, astUtils: ASTGenerate, historyModel: HistoryModel) {
    this.cell = cell;
    this.astUtils = astUtils;
    this.historyModel = historyModel;
    this.status = ChangeType.CELL_SAME;
    this.init();
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

  public clearStatus(): void {
    this.status = ChangeType.CELL_SAME;
  }

  public focus(): void {}

  public blur(): void {}

  protected async init(): Promise<void> {
    this.listen();
    this._ready.resolve(undefined);
  }

  public cellRun(exec: number = 0) {
    console.log("Running cell!", this.cell);
    var node = this.nodey;
    if (node.id === "*" || node.version === "*")
      this.status = ChangeType.CELL_CHANGED;
    this.historyModel.handleCellRun(exec, node);
  }

  protected listen(): void {
    this.cell.model.stateChanged.connect(
      (model: ICellModel, change: IChangedArgs<any>) => {
        if (change.name === "executionCount") {
          this.cellRun(change.newValue);
        }
      },
      this
    );
  }

  protected _ready = new PromiseDelegate<void>();
}

/*
*
*  Cell listen for code cells
*
*/
export class CodeCellListen extends CellListen {
  protected async init() {
    if (this.cell instanceof CodeCell) {
      var text: string = this.cell.editor.model.value.text;
      var outNode = this.outputToNodey();
      this._nodey = await this.astUtils.generateCodeNodey(text, {
        output: outNode,
        run: 0,
        cell: this
      });
      console.log("Nodey initialized to ", this._nodey, typeof this._nodey);
    }

    super.init();
  }

  private outputToNodey(): NodeyOutput[] {
    var output = (<CodeCell>this.cell).outputArea.model.toJSON();
    var outNode: NodeyOutput[] = [];
    if (output.length < 1) outNode = undefined;
    else {
      for (var item in output) outNode.push(new NodeyOutput(output[item]));
    }
    return outNode;
  }

  protected listen(): void {
    super.listen();
    if (this.cell.editor instanceof CodeMirrorEditor) {
      var editor = <CodeMirrorEditor>this.cell.editor;
      //editor.model.value.changed //listen in
      //editor.model.selections.changed //listen in

      CodeMirror.on(
        editor.doc,
        "change",
        (instance: CodeMirror.Editor, change: CodeMirror.EditorChange) => {
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
  protected async init() {
    this._nodey = Nodey.dictToMarkdownNodey(
      this.cell.model.value.text,
      this.historyModel,
      this
    ).id;
    console.log("Nodey initialized to ", this._nodey, this.nodey, this.cell);
    super.init();
  }

  protected listen(): void {
    super.listen();
    if (this.cell.editor instanceof CodeMirrorEditor) {
      var editor = <CodeMirrorEditor>this.cell.editor;
      //editor.model.value.changed //listen in
      //editor.model.selections.changed //listen in

      CodeMirror.on(
        editor.doc,
        "change",
        (instance: CodeMirror.Editor, change: CodeMirror.EditorChange) => {
          this.historyModel.starNodey(
            [
              (node: Nodey) => {
                console.log("Updating nodey", node);
                (<NodeyMarkdown>node).markdown = (<NodeyMarkdown>(
                  node
                )).cell.cell.model.value.text;
              }
            ],
            this.nodey
          );
        }
      );
    }
  }
}
