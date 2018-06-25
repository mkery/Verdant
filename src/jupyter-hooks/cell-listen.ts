import { Cell, CodeCell, ICellModel } from "@jupyterlab/cells";

import { OutputArea } from "@jupyterlab/outputarea";

import { PromiseDelegate } from "@phosphor/coreutils";

import { ASTGenerate } from "../analysis/ast-generate";

import {
  Nodey,
  NodeyCell,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyOutput
} from "../nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "../history-model";

import { IChangedArgs } from "@jupyterlab/coreutils";

import { ChangeType } from "../run";

export abstract class CellListen {
  cell: Cell;
  astUtils: ASTGenerate;
  protected _nodey: number;
  historyModel: HistoryModel;
  status: number;
  position: number;

  constructor(
    cell: Cell,
    astUtils: ASTGenerate,
    historyModel: HistoryModel,
    position: number
  ) {
    this.cell = cell;
    this.astUtils = astUtils;
    this.historyModel = historyModel;
    this.position = position;
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

  public cellRun(exec: number = null) {
    var node = this.nodey;
    if (node.id === "*" || node.version === "*")
      this.status = ChangeType.CELL_CHANGED;
    console.log("Running cell!", this.cell, exec, typeof node);
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
    var cell = this.cell as CodeCell;
    var text: string = cell.editor.model.value.text;
    var outNode = Nodey.outputToNodey(cell, this.historyModel);
    this._nodey = await this.astUtils.generateCodeNodey(text, this.position, {
      output: outNode,
      run: 0,
      cell: this
    });

    super.init();
  }

  public get output(): NodeyOutput[][] {
    var output = (this.nodey as NodeyCodeCell).output;
    if (output)
      return output.map(run => {
        if (run.out)
          //TODO bug should not occur
          return run.out.map(o => this.historyModel.getOutput(o));
      });
  }

  public get outputArea(): OutputArea {
    return (this.cell as CodeCell).outputArea;
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
    var nodey = Nodey.dictToMarkdownNodey(
      this.cell.model.value.text,
      this.position,
      this.historyModel,
      this
    );
    this._nodey = nodey.id;
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
          this.historyModel.stageChanges(
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
