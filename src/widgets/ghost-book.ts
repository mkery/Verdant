// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PathExt } from "@jupyterlab/coreutils";

import { ABCWidgetFactory, DocumentRegistry } from "@jupyterlab/docregistry";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Message } from "@phosphor/messaging";

import { Widget } from "@phosphor/widgets";

import { IInstanceTracker } from "@jupyterlab/apputils";

import { Token } from "@phosphor/coreutils";

import "../../style/index.css";

/**
 * A class that tracks editor widgets.
 */
export interface IImageTracker extends IInstanceTracker<GhostBook> {}

/* tslint:disable */
/**
 * The editor tracker token.
 */
export const IImageTracker = new Token<GhostBook>(
  "@jupyterlab/ghostbook:GhostBook"
);
/* tslint:enable */

/**
 * The class name added to a imageviewer.
 */
const GHOST_BOOK = "v-Verdant-GhostBook";

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
