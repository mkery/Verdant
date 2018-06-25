// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PathExt } from "@jupyterlab/coreutils";

import { ABCWidgetFactory, DocumentRegistry } from "@jupyterlab/docregistry";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Message } from "@phosphor/messaging";

import { Widget, PanelLayout } from "@phosphor/widgets";

import { Toolbar, ToolbarButton } from "@jupyterlab/apputils";

import "../../style/index.css";

/**
 * The class name added to a imageviewer.
 */
const GHOST_BOOK = "v-Verdant-GhostBook";
const GHOST_BOOK_TOOLBAR_CLASS = "v-Verdant-GhostBook-toolbar";
const GHOST_BOOK_TOOLBAR_PRIOR = "v-Verdant-GhostBook-toolbar-priorButton";
const GHOST_BOOK_TOOLBAR_NEXT = "v-Verdant-GhostBook-toolbar-nextButton";

/**
 * A widget for images.
 */
export class GhostBook extends Widget implements DocumentRegistry.IReadyWidget {
  /**
   * The ghost book's widget's context.
   */
  readonly context: DocumentRegistry.Context;

  /**
   * Construct a new image widget.
   */
  constructor(context: DocumentRegistry.Context) {
    super();
    this.context = context;
    this.node.tabIndex = -1;
    this.addClass(GHOST_BOOK);

    let layout = (this.layout = new PanelLayout());

    // Toolbar
    let toolbar = new Toolbar();
    toolbar.addClass(GHOST_BOOK_TOOLBAR_CLASS);
    toolbar.addItem("priorChange", this.createPriorButton());
    toolbar.addItem("nextChange", this.createNextButton());
    layout.addWidget(toolbar);

    let test = document.createElement("h1");
    test.textContent = "It's alive!!!";
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
    let cm = context.contentsModel;
    if (!cm) {
      return;
    }
    let content = context.model.toString();
    console.log("content is", content, cm);
  }

  private _ready = new PromiseDelegate<void>();
}

/**
 * A widget factory for images.
 */
export class GhostBookFactory extends ABCWidgetFactory<
  GhostBook,
  DocumentRegistry.IModel
> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): GhostBook {
    return new GhostBook(context);
  }
}

export namespace GhostBook {
  export const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";
}
