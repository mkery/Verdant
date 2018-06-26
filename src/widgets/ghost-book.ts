// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PathExt } from "@jupyterlab/coreutils";

import { Run } from "../run";

import { RenderMimeRegistry } from "@jupyterlab/rendermime";

import { each } from "@phosphor/algorithm";

import { DocumentRegistry } from "@jupyterlab/docregistry";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Message } from "@phosphor/messaging";

import { Widget, PanelLayout } from "@phosphor/widgets";

import { Toolbar, ToolbarButton } from "@jupyterlab/apputils";

import { NotebookModel } from "@jupyterlab/notebook";

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

import "../../style/index.css";

/**
 * The class name added to a imageviewer.
 */
const GHOST_BOOK = "v-Verdant-GhostBook";
const GHOST_BOOK_TOOLBAR_CLASS = "v-Verdant-GhostBook-toolbar";
const GHOST_BOOK_TOOLBAR_PRIOR = "v-Verdant-GhostBook-toolbar-priorButton";
const GHOST_BOOK_TOOLBAR_NEXT = "v-Verdant-GhostBook-toolbar-nextButton";
const GHOST_BOOK_TOOLBAR_LABEL = "v-Verdant-GhostBook-toolbar-label";
const GHOST_BOOK_TOOLBAR_EDIT_ICON = "v-Verdant-GhostBook-toolbar-edit-icon";
const GHOST_BOOK_CELL_AREA = "v-Verdant-GhostBook-cell-area";
const GHOST_BOOK_CELL_CLASS = "v-Verdant-GhostBook-cell";
/**
 * A widget for images.
 */
export class GhostBook extends Widget implements DocumentRegistry.IReadyWidget {
  /**
   * The ghost book's widget's context.
   */
  readonly context: DocumentRegistry.IContext<GhostBookModel>;
  readonly model: GhostBookModel;
  readonly rendermime: RenderMimeRegistry;
  readonly cellArea: Widget;

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

    this.cellArea = new Widget();
    this.cellArea.layout = new PanelLayout();
    this.cellArea.addClass(GHOST_BOOK_CELL_AREA);

    this._onTitleChanged();
    context.pathChanged.connect(
      this._onTitleChanged,
      this
    );

    context.ready.then(() => {
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

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.isDisposed || !this.context.isReady) {
      return;
    }
    this._render();
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
    let timestamp = new Date(context.model.timestamp);

    let layout = (this.layout = new PanelLayout());

    // Toolbar
    let toolbar = new Toolbar();
    toolbar.addClass(GHOST_BOOK_TOOLBAR_CLASS);
    toolbar.addItem("edit", this.createEditButton());
    toolbar.addItem(
      "editLabel",
      new ToolbarLabel(
        "Work in notebook at Run #" +
          run +
          " " +
          Run.formatDate(timestamp) +
          " " +
          Run.formatTime(timestamp)
      )
    );
    toolbar.addItem("spacer", Toolbar.createSpacerItem());
    toolbar.addItem("priorChange", this.createPriorButton());
    toolbar.addItem("nextChange", this.createNextButton());
    toolbar.addItem("changeLabel", new ToolbarLabel("0/0 changes"));
    layout.addWidget(toolbar);

    layout.addWidget(this.cellArea);

    console.log("content is", context);
    let model = context.model as NotebookModel;
    let cells = model.cells;
    each(cells, (cell: ICellModel, i: number) => {
      console.log("Cell:", cell);
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
    widget.readOnly = true;
    var codeMirror = widget.editorWidget.node.getElementsByClassName(
      "CodeMirror"
    )[0];
    codeMirror.classList.replace("cm-s-jupyter", GHOST_BOOK_CELL_CLASS);
    let layout = this.cellArea.layout as PanelLayout;
    layout.insertWidget(index, widget);
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
    changeLabel.textContent = text;
    this.node.appendChild(changeLabel);
  }
}
