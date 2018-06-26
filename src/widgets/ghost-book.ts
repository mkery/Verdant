// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PathExt } from "@jupyterlab/coreutils";

import { IEditorMimeTypeService } from "@jupyterlab/codeeditor";

import { RenderMimeRegistry } from "@jupyterlab/rendermime";

import { each } from "@phosphor/algorithm";

import { ABCWidgetFactory, DocumentRegistry } from "@jupyterlab/docregistry";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Message } from "@phosphor/messaging";

import { Widget, PanelLayout } from "@phosphor/widgets";

import { Toolbar, ToolbarButton } from "@jupyterlab/apputils";

import {
  NotebookModel,
  NotebookWidgetFactory,
  NotebookPanel
} from "@jupyterlab/notebook";

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

import "../../style/index.css";

/**
 * The class name added to a imageviewer.
 */
const GHOST_BOOK = "v-Verdant-GhostBook";
const GHOST_BOOK_TOOLBAR_CLASS = "v-Verdant-GhostBook-toolbar";
const GHOST_BOOK_TOOLBAR_PRIOR = "v-Verdant-GhostBook-toolbar-priorButton";
const GHOST_BOOK_TOOLBAR_NEXT = "v-Verdant-GhostBook-toolbar-nextButton";
const GHOST_BOOK_TOOLBAR_LABEL = "v-Verdant-GhostBook-toolbar-label";
/**
 * A widget for images.
 */
export class GhostBook extends Widget implements DocumentRegistry.IReadyWidget {
  /**
   * The ghost book's widget's context.
   */
  readonly context: DocumentRegistry.Context;
  readonly rendermime: RenderMimeRegistry;

  /**
   * Construct a new image widget.
   */
  constructor(
    context: DocumentRegistry.Context,
    options: { [key: string]: any }
  ) {
    super();
    this.context = context;
    this.rendermime = options.rendermime;
    this.node.tabIndex = -1;
    this.addClass(GHOST_BOOK);

    let layout = (this.layout = new PanelLayout());

    // Toolbar
    let toolbar = new Toolbar();
    toolbar.addClass(GHOST_BOOK_TOOLBAR_CLASS);
    toolbar.addItem("priorChange", this.createPriorButton());
    let changeLabel = document.createElement("div");
    changeLabel.textContent = "0/0 changes";
    changeLabel.classList.add(GHOST_BOOK_TOOLBAR_LABEL);
    toolbar.addItem("nextChange", this.createNextButton());
    toolbar.node.appendChild(changeLabel);
    layout.addWidget(toolbar);

    let test = document.createElement("div");
    test.textContent = this.context.model.toString();
    this.node.appendChild(test);

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
    //widget.addClass(NB_CELL_CLASS);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, widget);
  }

  private _ready = new PromiseDelegate<void>();
}

/**
 * A widget factory for images.
 */
export class GhostBookFactory extends ABCWidgetFactory<
  GhostBook,
  NotebookModel
> {
  /*
   * The rendermime instance.
   */
  readonly rendermime: RenderMimeRegistry;

  /**
   * The content factory used by the widget factory.
   */
  readonly contentFactory: NotebookPanel.IContentFactory;

  /**
   * The service used to look up mime types.
   */
  readonly mimeTypeService: IEditorMimeTypeService;

  //private _editorConfig: StaticNotebook.IEditorConfig;

  constructor(options: NotebookWidgetFactory.IOptions) {
    super(options);
    this.rendermime = options.rendermime;
    /*this.contentFactory = NotebookPanel.defaultContentFactory;
    this.mimeTypeService = options.mimeTypeService;
    this._editorConfig = StaticNotebook.defaultEditorConfig;*/
  }
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<NotebookModel>
  ): GhostBook {
    return new GhostBook(context, { rendermime: this.rendermime });
  }
}

export namespace GhostBook {
  export const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";
}
