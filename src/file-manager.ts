import { PathExt } from "@jupyterlab/coreutils";

import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { nbformat } from "@jupyterlab/coreutils";

import { Contents, ContentsManager } from "@jupyterlab/services";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { CellRunData } from "./model/run";

import { NodeyCode } from "./model/nodey";

import { GhostBook } from "./ghost-book/ghost-book";

import { HistoryModel } from "./model/history";

export class FileManager {
  readonly docManager: IDocumentManager;
  private ghostPath: string;

  constructor(docManager: IDocumentManager) {
    this.docManager = docManager;
  }

  public writeToFile(
    notebook: NotebookListen,
    historyModel: HistoryModel
  ): Promise<void> {
    return new Promise((accept, reject) => {
      var notebookPath = notebook.path;
      //console.log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath);
      name = name.substring(0, name.indexOf(".")) + ".ipyhistory";
      //console.log("name is", name)
      var path =
        "/" +
        notebookPath.substring(0, notebookPath.lastIndexOf("/") + 1) +
        name;
      //console.log("goal path is ", path)

      var saveModel = new HistorySaveModel(
        name,
        path,
        "today",
        "today",
        JSON.stringify(historyModel.toJSON())
      );
      //console.log("Model to save is", saveModel)

      let contents = new ContentsManager();
      contents
        .save(path, saveModel)
        .then(() => {
          console.log("Model written to file", saveModel);
          accept();
        })
        .catch(rej => {
          //here when you reject the promise if the filesave fails
          console.error(rej);
          reject();
        });
    });
  }

  public async openGhost(
    data: nbformat.INotebookContent,
    notebook: NotebookListen
  ): Promise<boolean> {
    let wasOpen = true;
    if (!this.ghostPath) {
      let path = "";
      var name = notebook.name;
      path = notebook.path;
      name = name.substring(0, name.indexOf(".")) + ".ghost";
      path = "/" + path.substring(0, path.lastIndexOf("/") + 1) + name;
      await this.writeGhostFile(notebook, data);
      this.ghostPath = path;
      wasOpen = false;
    }

    //let widget = this.docManager.findWidget(path);
    let widget = this.docManager.openOrReveal(this.ghostPath);
    if (widget) {
      console.log("ATTEMPTING TO OPEN GHOST", widget);
      (widget.content as GhostBook).feedNewData(data);
    }
    return wasOpen;
  }

  public writeGhostFile(notebook: NotebookListen, data: {}): Promise<string> {
    return new Promise((accept, reject) => {
      var notebookPath = notebook.path;
      //console.log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath);
      name = name.substring(0, name.indexOf(".")) + ".ghost";
      //console.log("name is", name)
      var path =
        "/" +
        notebookPath.substring(0, notebookPath.lastIndexOf("/") + 1) +
        name;
      //console.log("goal path is ", path)

      var saveModel = new HistorySaveModel(
        name,
        path,
        "today",
        "today",
        JSON.stringify(data, null, 2)
      );
      //console.log("Model to save is", saveModel)

      let contents = new ContentsManager();
      contents
        .save(path, saveModel)
        .then(() => {
          console.log("Model written to file", saveModel);
          accept(path);
        })
        .catch(rej => {
          //here when you reject the promise if the filesave fails
          console.error(rej);
          reject();
        });
    });
  }

  public loadFromFile(notebook: NotebookListen): Promise<any> {
    return new Promise(accept => {
      var notebookPath = notebook.path;
      //console.log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath);
      name = name.substring(0, name.indexOf(".")) + ".ipyhistory";
      //console.log("name is", name)
      var path =
        "/" +
        notebookPath.substring(0, notebookPath.lastIndexOf("/") + 1) +
        name;
      let contents = new ContentsManager();
      contents
        .get(path)
        .then(res => {
          console.log("Found a model ", res);
          accept(res.content);
        })
        .catch(() => {
          //here when you reject the promise if the filesave fails
          //console.error(rej);
          accept(null);
        });
    });
  }
}

export class HistorySaveModel implements Contents.IModel {
  readonly type: Contents.ContentType = "file";
  readonly writable: boolean = true;
  readonly mimetype: string = "application/json";
  readonly format: Contents.FileFormat = "text";

  readonly name: string;
  readonly path: string;
  readonly created: string;
  readonly last_modified: string;
  readonly content: any;

  constructor(
    name: string,
    path: string,
    createDate: string,
    modDate: string,
    content: any
  ) {
    this.name = name;
    this.path = path;
    this.created = createDate;
    this.last_modified = modDate;
    this.content = content;
  }
}

export interface serialized_Nodey {
  typeName: string;
  parent: string;
  runs: number[];
}

export interface serialized_NodeyOutput extends serialized_Nodey {
  output: { [key: string]: any };
}

export interface serialized_NodeyMarkdown extends serialized_Nodey {
  markdown: string;
}

export interface serialized_NodeyCode extends serialized_Nodey {
  type: string;
  output?: { run: number; out: string[] }[];
  literal?: any;
  start?: { line: number; ch: number };
  end?: { line: number; ch: number };
  content?: any[];
  right: string;
}

export interface serialized_NodeyCodeCell extends serialized_NodeyCode {
  starNodes?: NodeyCode[];
}

export interface serialized_Run {
  run: number;
  timestamp: number;
  cells: CellRunData[];
}

export interface serialized_Star {
  target_type: string;
  target: string;
}

export interface serialized_Note {
  target_type: string;
  target: string;
  note: string;
}

export interface serialized_NodeyHistory {
  runs: serialized_Run[];
  cells: number[];
  nodey: { nodey: number; versions: serialized_Nodey[] }[];
  output: { output: number; versions: serialized_NodeyOutput[] }[];
  deletedCells: number[];
  stars: serialized_Star[];
  notes: serialized_Note[];
}
