import { PathExt } from "@jupyterlab/coreutils";

import { VerNotebook } from "../components/notebook";

import { Contents, ContentsManager } from "@jupyterlab/services";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { log } from "../components/notebook";

import { CellRunData } from "../model/checkpoint";

import { History } from "../model/history";

export class FileManager {
  readonly docManager: IDocumentManager;

  constructor(docManager: IDocumentManager) {
    this.docManager = docManager;
  }

  public writeToFile(
    historyModel: History,
    notebook: VerNotebook
  ): Promise<void> {
    return new Promise((accept, reject) => {
      var notebookPath = notebook.path;
      //log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath);
      name = name.substring(0, name.indexOf(".")) + ".ipyhistory";
      //log("name is", name)
      var path =
        "/" +
        notebookPath.substring(0, notebookPath.lastIndexOf("/") + 1) +
        name;
      //log("goal path is ", path)

      var saveModel = new HistorySaveModel(
        name,
        path,
        "today",
        "today",
        JSON.stringify(historyModel.toJSON())
      );
      //log("Model to save is", saveModel)

      let contents = new ContentsManager();
      contents
        .save(path, saveModel)
        .then(() => {
          log("Model written to file", saveModel);
          accept();
        })
        .catch(rej => {
          //here when you reject the promise if the filesave fails
          console.error(rej);
          reject();
        });
    });
  }

  public loadFromFile(notebook: VerNotebook): Promise<any> {
    return new Promise(accept => {
      var notebookPath = notebook.path;
      //log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath);
      name = name.substring(0, name.indexOf(".")) + ".ipyhistory";
      //log("name is", name)
      var path =
        "/" +
        notebookPath.substring(0, notebookPath.lastIndexOf("/") + 1) +
        name;
      let contents = new ContentsManager();
      contents
        .get(path)
        .then(res => {
          log("Found a model ", res);
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
  parent: string;
  created: number;
}

export interface serialized_NodeyOutput extends serialized_Nodey {
  raw: { [key: string]: any };
}

export type serialized_Run = (string | number | CellRunData | string[])[];

export interface serialized_NodeyHistory {
  runs: serialized_Run[];
  cells: number[];
  nodey: { nodey: number; versions: serialized_Nodey[] }[];
  output: { output: number; versions: serialized_NodeyOutput[] }[];
  deletedCells: number[];
}
