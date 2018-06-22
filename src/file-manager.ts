import { PathExt } from "@jupyterlab/coreutils";

import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { Contents, ContentsManager } from "@jupyterlab/services";

import { HistoryModel } from "./history-model";

export class FileManager {
  private _notebook: NotebookListen;
  private _historyModel: HistoryModel;

  constructor(notebook: NotebookListen, historyModel: HistoryModel) {
    this._notebook = notebook;
    this._historyModel = historyModel;
  }

  writeToFile(): Promise<void> {
    return new Promise((accept, reject) => {
      var notebookPath = this._notebook.path;
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
        JSON.stringify(this._historyModel.toJSON())
      );
      //console.log("Model to save is", saveModel)

      let contents = new ContentsManager();
      contents
        .save(path, saveModel)
        .then(res => {
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

  loadFromFile(): Promise<void> {
    return new Promise((accept, reject) => {
      var notebookPath = this._notebook.path;
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
          accept();
        })
        .catch(rej => {
          //here when you reject the promise if the filesave fails
          console.error(rej);
          reject();
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
  run?: number; //TODO
}

export interface serialized_NodeyOutput extends serialized_Nodey {
  output: { [key: string]: any };
  runs: number[];
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
  runs: number[];
}

export interface serialized_NodeyList {
  nodey: number;
  versions: serialized_Nodey[];
}
