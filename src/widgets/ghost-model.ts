import { IEditorMimeTypeService } from "@jupyterlab/codeeditor";

import { ABCWidgetFactory } from "@jupyterlab/docregistry";

import { RenderMimeRegistry } from "@jupyterlab/rendermime";

import { DocumentRegistry } from "@jupyterlab/docregistry";

import { nbformat } from "@jupyterlab/coreutils";

import {
  NotebookModel,
  NotebookWidgetFactory,
  NotebookModelFactory,
  NotebookPanel,
  INotebookModel
} from "@jupyterlab/notebook";

import { IModelDB } from "@jupyterlab/observables";

import { GhostBook } from "./ghost-book";

import { ILayoutRestorer } from "@jupyterlab/application";

import { IEditorServices } from "@jupyterlab/codeeditor";

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import { InstanceTracker } from "@jupyterlab/apputils";

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
    context: DocumentRegistry.IContext<GhostBookModel>
  ): GhostBook {
    return new GhostBook(context, { rendermime: this.rendermime });
  }
}

export class GhostModelFactory extends NotebookModelFactory {
  /**
   * Create a new model for a given path.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string, modelDB?: IModelDB): INotebookModel {
    let contentFactory = this.contentFactory;
    return new GhostBookModel({ languagePreference, contentFactory, modelDB });
  }

  /**
   * The name of the model.
   */
  get name(): string {
    return "ghost";
  }
}

export class GhostBookModel extends NotebookModel {
  fromJSON(value: nbformat.INotebookContent): void {
    this._run = value.metadata.run as number;
    this._timestamp = value.metadata.timestamp as number;
    this._origin = value.metadata.origin as string;
    super.fromJSON(value);
  }

  public get run() {
    return this._run;
  }

  public get timestamp() {
    return this._timestamp;
  }

  public get origin() {
    return this._origin;
  }

  private _run: number;
  private _timestamp: number;
  private _origin: string;
}

export namespace GhostBookFactory {
  const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";

  export function registerFileType(
    docRegistry: DocumentRegistry,
    restorer: ILayoutRestorer,
    rendermime: IRenderMimeRegistry,
    contentFactory: NotebookPanel.IContentFactory,
    editorServices: IEditorServices
  ): GhostBookFactory {
    let ghostFactory = new GhostBookFactory({
      name: "Ghost",
      modelName: "ghost",
      fileTypes: ["ghost"],
      defaultFor: ["ghost"],
      readOnly: true,
      rendermime: rendermime,
      contentFactory,
      editorConfig: null,
      mimeTypeService: editorServices.mimeTypeService
    });
    let ghostTracker = new InstanceTracker<GhostBook>({
      namespace: "ghostbook"
    });

    // Handle state restoration.
    restorer.restore(ghostTracker, {
      command: "docmanager:open",
      args: widget => ({ path: widget.context.path, factory: "Ghost" }),
      name: widget => "Run of " + widget.context.path
    });

    docRegistry.addModelFactory(new GhostModelFactory({}));
    docRegistry.addWidgetFactory(ghostFactory);
    docRegistry.addFileType({
      name: "ghost",
      extensions: [".ghost"],
      fileFormat: "json",
      mimeTypes: ["application/x-ipynb+json"],
      iconClass: "jp-MaterialIcon " + GHOST_BOOK_ICON
    });
    //console.log("Doc registrey is:", docRegistry);

    ghostFactory.widgetCreated.connect((sender: any, widget: GhostBook) => {
      // Notify the instance tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => {
        ghostTracker.save(widget);
      });
      ghostTracker.add(widget);

      const types = docRegistry.getFileTypesForPath(widget.context.path);

      if (types.length > 0) {
        widget.title.iconClass = GHOST_BOOK_ICON;
      }
    });

    return ghostFactory;
  }
}
