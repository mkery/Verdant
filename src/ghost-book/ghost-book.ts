// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PathExt } from "@jupyterlab/coreutils";

import { Run, ChangeType } from "../model/run";

import { nbformat } from "@jupyterlab/coreutils";

import { RenderMimeRegistry } from "@jupyterlab/rendermime";

import { each } from "@phosphor/algorithm";

import { DocumentRegistry } from "@jupyterlab/docregistry";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Message } from "@phosphor/messaging";

import { Widget, PanelLayout } from "@phosphor/widgets";

import { Toolbar, ToolbarButton } from "@jupyterlab/apputils";

import { NotebookModel } from "@jupyterlab/notebook";

import { NodeChangeDesc } from "../inspect";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import {
  ICellModel,
  Cell,
  CodeCell,
  RawCell,
  MarkdownCell,
  IMarkdownCellModel,
  ICodeCellModel,
  IRawCellModel
} from "@jupyterlab/cells";

import { GhostBookModel } from "./ghost-model";

/**
 * The class name added to a imageviewer.
 */
const GHOST_BOOK = "v-Verdant-GhostBook";
const GHOST_BOOK_TOOLBAR_CLASS = "v-Verdant-GhostBook-toolbar";
const GHOST_BOOK_TOOLBAR_PRIOR = "v-Verdant-GhostBook-toolbar-priorButton";
const GHOST_BOOK_TOOLBAR_NEXT = "v-Verdant-GhostBook-toolbar-nextButton";
const GHOST_BOOK_TOOLBAR_LABEL = "v-Verdant-GhostBook-toolbar-label";
const GHOST_BOOK_TOOLBAR_LABEL_TEXT = "v-Verdant-GhostBook-toolbar-label-text";
const GHOST_BOOK_TOOLBAR_EDIT_ICON = "v-Verdant-GhostBook-toolbar-edit-icon";
const GHOST_BOOK_CELL_AREA = "v-Verdant-GhostBook-cell-area";
const GHOST_BOOK_CELL_CLASS = "v-Verdant-GhostBook-cell";
const GHOST_CHANGED = "v-Verdant-GhostBook-cell-changed";
const GHOST_REMOVED = "v-Verdant-GhostBook-cell-removed";
const GHOST_ADDED = "v-Verdant-GhostBook-cell-added";
const GHOST_CODE_REMOVED = "v-Verdant-GhostBook-code-removed";
const GHOST_CODE_ADDED = "v-Verdant-GhostBook-code-added";

/**
 * A widget for images.
 */
export class GhostBook extends Widget {
  /**
   * The ghost book's widget's context.
   */
  readonly context: DocumentRegistry.IContext<GhostBookModel>;
  readonly model: GhostBookModel;
  readonly rendermime: RenderMimeRegistry;
  cellArea: Widget;
  runLabel: ToolbarLabel;
  changeLabel: ToolbarLabel;

  /**
   * Construct a new image widget.
   */
  constructor(
    context: DocumentRegistry.IContext<GhostBookModel>,
    options: { [key: string]: any }
  ) {
    super();
    this.context = context;
    this.model = context.model;
    this.rendermime = options.rendermime;
    this.node.tabIndex = -1;
    this.addClass(GHOST_BOOK);

    let layout = (this.layout = new PanelLayout());

    // Toolbar
    let toolbar = new Toolbar();
    toolbar.addClass(GHOST_BOOK_TOOLBAR_CLASS);
    toolbar.addItem("edit", this.createEditButton());
    this.runLabel = new ToolbarLabel("Work in notebook at Run #?? ??");
    toolbar.addItem("editLabel", this.runLabel);
    toolbar.addItem("spacer", Toolbar.createSpacerItem());
    toolbar.addItem("priorChange", this.createPriorButton());
    toolbar.addItem("nextChange", this.createNextButton());
    this.changeLabel = new ToolbarLabel("?/? changes");
    toolbar.addItem("changeLabel", this.changeLabel);
    layout.addWidget(toolbar);

    this._onTitleChanged();
    context.pathChanged.connect(
      this._onTitleChanged,
      this
    );

    context.ready.then(() => {
      console.log("this widget is", this);
      if (this.isDisposed) {
        return;
      }

      this._render();
      context.model.contentChanged.connect(
        this.update,
        this
      );
      context.fileChanged.connect(
        this.update,
        this
      );
      this._ready.resolve(void 0);
    });
  }

  /**
   * A promise that resolves when the image viewer is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  public feedNewData(dict: nbformat.INotebookContent) {
    console.log("updating Ghost book with new data", dict);
    this.context.model.fromJSON(dict);
    this._render();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.isDisposed || !this.context.isReady) {
      return;
    }
    console.log("Update request!", msg);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  createPriorButton(): ToolbarButton {
    return new ToolbarButton({
      className: GHOST_BOOK_TOOLBAR_PRIOR,
      onClick: () => {
        console.log("Prior change!");
      },
      tooltip: "Go to the previous change in this run"
    });
  }

  createNextButton(): ToolbarButton {
    return new ToolbarButton({
      className: GHOST_BOOK_TOOLBAR_NEXT,
      onClick: () => {
        console.log("Next change!");
      },
      tooltip: "Go to the next change in this run"
    });
  }

  createEditButton(): ToolbarButton {
    return new ToolbarButton({
      className: GHOST_BOOK_TOOLBAR_EDIT_ICON,
      onClick: () => {
        console.log("edit!");
      },
      tooltip: "Start editing this past notebook as a working version"
    });
  }

  /**
   * Handle a change to the title.
   */
  private _onTitleChanged(): void {
    this.title.label = PathExt.basename(this.context.localPath);
  }

  /**
   * Render the widget content.
   */
  private _render(): void {
    let context = this.context;
    let run = context.model.run;
    let origin = context.model.origin;
    let timestamp = new Date(context.model.timestamp);
    let totalChanges = context.model.totalChanges;

    this.runLabel.setText(
      "Work in notebook at Run #" +
        run +
        " " +
        Run.formatDate(timestamp) +
        " " +
        Run.formatTime(timestamp)
    );
    var min = Math.min(1, totalChanges.length);
    this.changeLabel.setText(min + "/" + totalChanges.length + " changes");

    this.title.label = "Run #" + run + " " + origin;

    if (this.cellArea) {
      (this.layout as PanelLayout).removeWidget(this.cellArea);
      this.cellArea = null;
    }
    this.cellArea = new Widget();
    this.cellArea.layout = new PanelLayout();
    this.cellArea.addClass(GHOST_BOOK_CELL_AREA);
    (this.layout as PanelLayout).addWidget(this.cellArea);

    //console.log("content is", context);
    let model = context.model as NotebookModel;
    let cells = model.cells;
    each(cells, (cell: ICellModel, i: number) => {
      this._insertCell(i, cell);
    });
  }

  /**
   * Create a cell widget and insert into the notebook.
   */
  private _insertCell(index: number, cell: ICellModel): void {
    let widget: Cell;
    let rendermime = this.rendermime;
    switch (cell.type) {
      case "code":
        widget = new CodeCell({ model: cell as ICodeCellModel, rendermime });
        //TODO widget.model.mimeType = this._mimetype;
        break;
      case "markdown":
        widget = new MarkdownCell({
          model: cell as IMarkdownCellModel,
          rendermime
        });
        break;
      default:
        widget = new RawCell({ model: cell as IRawCellModel });
    }
    //console.log("Cell:", widget);
    widget.readOnly = true;
    var changes = cell.metadata.get("change");
    if (changes) this._decorateChanges(widget, cell, changes as number);
    else {
      var codeMirror = widget.editorWidget.node.getElementsByClassName(
        "CodeMirror"
      )[0];
      codeMirror.classList.replace("cm-s-jupyter", GHOST_BOOK_CELL_CLASS);
    }
    let layout = this.cellArea.layout as PanelLayout;
    layout.insertWidget(index, widget);
  }

  private _decorateChanges(widget: Cell, cell: ICellModel, change: number) {
    switch (cell.type) {
      case "code":
        this._decorateChanges_codeCell(widget as CodeCell, cell, change);
        break;
      case "markdown":
        //TODO
        break;
    }
  }

  private _decorateChanges_codeCell(
    widget: CodeCell,
    model: ICellModel,
    change: number
  ) {
    switch (change) {
      case ChangeType.CHANGED:
        widget.inputArea.node.classList.add(GHOST_CHANGED);
        this._decorateChanges_code(widget, model.metadata.get(
          "edits"
        ) as NodeChangeDesc[]);
        break;
      case ChangeType.REMOVED:
        widget.inputArea.node.classList.add(GHOST_REMOVED);
        break;
      case ChangeType.ADDED:
        widget.inputArea.node.classList.add(GHOST_ADDED);
        break;
    }
  }

  private _decorateChanges_code(widget: CodeCell, changes: NodeChangeDesc[]) {
    console.log("changes are ", changes);
    changes.forEach((edit: NodeChangeDesc) => {
      var codemirror = widget.editor as CodeMirrorEditor;
      switch (edit.change) {
        case ChangeType.CHANGED:
          codemirror.doc.markText(edit.start, edit.end, {
            className: GHOST_CODE_ADDED
          });
          codemirror.doc.replaceRange(edit.text, edit.start);
          //TODO multiline text
          codemirror.doc.markText(
            edit.start,
            { line: edit.start.line, ch: edit.start.ch + edit.text.length },
            {
              className: GHOST_CODE_REMOVED
            }
          );
          break;
        case ChangeType.REMOVED:
          break;
        case ChangeType.ADDED:
          codemirror.doc.markText(
            edit.start,
            { line: edit.start.line, ch: edit.start.ch + edit.text.length },
            {
              className: GHOST_CODE_ADDED
            }
          );
          break;
      }
    });
  }

  private _ready = new PromiseDelegate<void>();
}

/**
 * A spacer widget.
 */
export class ToolbarLabel extends Widget {
  /**
   * Construct a new spacer widget.
   */
  constructor(text: string) {
    super();
    this.addClass(GHOST_BOOK_TOOLBAR_LABEL);
    let changeLabel = document.createElement("div");
    changeLabel.classList.add(GHOST_BOOK_TOOLBAR_LABEL_TEXT);
    changeLabel.textContent = text;
    this.node.appendChild(changeLabel);
  }

  public setText(text: string) {
    this.node.getElementsByClassName(
      GHOST_BOOK_TOOLBAR_LABEL_TEXT
    )[0].textContent = text;
  }
}
