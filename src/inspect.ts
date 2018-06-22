import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { FileManager } from "./file-manager";

import { nbformat } from "@jupyterlab/coreutils";

import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken,
  NodeyCodeCell
} from "./nodey";

import { Run, CellRunData } from "./run";

import { CodeCell } from "@jupyterlab/cells";

import { HistoryModel } from "./history-model";

import { CellListen } from "./jupyter-hooks/cell-listen";

import { ASTUtils } from "./analysis/ast-utils";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { Signal } from "@phosphor/signaling";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

export class Inspect {
  private _notebook: NotebookListen;
  private _historyModel: HistoryModel;
  private _targetChanged = new Signal<this, Nodey>(this);
  private _target: Nodey;
  renderBaby: RenderBaby;

  constructor(historyModel: HistoryModel, renderBaby: RenderBaby) {
    this._historyModel = historyModel;
    this.renderBaby = renderBaby;
  }

  set notebook(notebook: NotebookListen) {
    this._notebook = notebook;
    this._notebook.activeCellChanged.connect(
      (sender: any, cell: CellListen) => {
        this.changeTarget([cell.nodey]);
      }
    );
  }

  public produceNotebook(run: Run) {
    var cells = run.cells.map((cellDat: CellRunData) => {
      var nodey = this._historyModel.getNodey(cellDat.node);
      var jsn: { [key: string]: any } = {
        cell_type: nodey.typeName,
        metadata: {},
        source: [] as string[]
      };
      jsn.source = (this.renderNode(nodey) || "").split("\n");
      if (nodey instanceof NodeyCode) {
        jsn.executionCount = 0;
        var outputList: {}[] = [];
        nodey.output.map(dict => {
          if (dict.out)
            //TODO bug
            dict.out.map((outName: string) => {
              var outputNode = this._historyModel.getOutput(outName);
              outputList.push(outputNode.raw);
            });
        });
        jsn.outputs = outputList;
      }
      return jsn;
    });

    var metadata = this._notebook.metadata;
    let metaJsn = Object.create(null) as nbformat.INotebookMetadata;
    for (let key of metadata.keys()) {
      metaJsn[key] = JSON.parse(JSON.stringify(metadata.get(key)));
    }

    var file = {
      cells: cells,
      metadata: metaJsn,
      nbformat_minor: this._notebook.nbformatMinor,
      nbformat: this._notebook.nbformat
    };

    FileManager.writeGhostFile(
      this._notebook,
      this._historyModel,
      run.id,
      file
    );
  }

  get targetChanged(): Signal<this, Nodey> {
    return this._targetChanged;
  }

  get versionsOfTarget() {
    var nodeVerList = this._historyModel.getVersionsFor(this._target);
    console.log("Found versions", nodeVerList);
    var recovered = nodeVerList.versions.map((item: Nodey) =>
      this.renderNode(item)
    );
    return recovered;
  }

  changeTarget(nodey: Nodey[]) {
    //this._historyModel.dump();
    console.log("new target!", nodey);
    this._target = nodey[0]; //TODO
    this._targetChanged.emit(this._target);
  }

  public figureOutTarget(
    parent: NodeyCodeCell,
    cell: CodeCell,
    elem: HTMLElement
  ) {
    var codeBlock = this.findAncestor(elem, "CodeMirror-code");
    var lineCount = codeBlock.getElementsByClassName("CodeMirror-line").length;
    var lineDiv = this.findAncestor(elem, "CodeMirror-line");
    var lineNum = Math.round(
      (lineDiv.offsetTop / codeBlock.offsetHeight) * lineCount
    );
    var lineText = (cell.editor as CodeMirrorEditor).doc.getLine(lineNum);

    if (elem.hasAttribute("role")) {
      // a full line in Code Mirror
      var res = ASTUtils.findNodeAtRange(
        parent,
        {
          start: { line: lineNum, ch: 0 },
          end: { line: lineNum, ch: lineText.length - 2 }
        },
        this._historyModel
      );
      return res || parent; //just in case no more specific result is found
    } else {
      var spanRol = this.findAncestorByAttr(elem, "role");
      var startCh = Math.round(
        (elem.offsetLeft / spanRol.offsetWidth) * lineText.length
      );
      var endCh = Math.round(
        ((elem.offsetLeft + elem.offsetWidth) / spanRol.offsetWidth) *
          lineText.length
      );
      return ASTUtils.findNodeAtRange(
        parent,
        {
          start: { line: lineNum, ch: startCh },
          end: { line: lineNum, ch: endCh }
        },
        this._historyModel
      );
    }
  }

  private findAncestorByAttr(el: HTMLElement, attr: string) {
    if (el.hasAttribute(attr)) return el;
    while ((el = el.parentElement) && !el.hasAttribute(attr));
    return el;
  }

  private findAncestor(el: HTMLElement, cls: string) {
    if (el.classList.contains(cls)) return el;
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el;
  }

  public renderNode(nodey: Nodey): any {
    if (nodey instanceof NodeyCode) return this.renderCodeNode(nodey);
    else if (nodey instanceof NodeyMarkdown)
      return this.renderMarkdownNode(nodey);
    else if (nodey instanceof NodeyOutput) return this.renderOutputNode(nodey);
  }

  private renderCodeNode(nodey: NodeyCode): string {
    var literal = "";
    if (nodey.literal) literal = nodey.literal + " "; // add in spaceing
    if (nodey.content) {
      var priorLiteral = false;
      nodey.content.forEach(name => {
        if (name instanceof SyntaxToken) {
          if (!priorLiteral && literal != "") {
            literal = literal.substring(0, literal.length - 1) + name.tokens;
          } else {
            literal += name.tokens;
          }
          priorLiteral = true;
        } else {
          var child = this._historyModel.getNodey(name);
          literal += this.renderCodeNode(child as NodeyCode);
          priorLiteral = false;
        }
      });
    }
    return literal;
  }

  private renderMarkdownNode(nodey: NodeyMarkdown): string {
    return nodey.markdown;
  }

  private renderOutputNode(nodey: NodeyOutput): string {
    return JSON.stringify(nodey.raw);
  }
}
