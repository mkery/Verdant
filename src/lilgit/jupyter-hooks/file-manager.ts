import { PathExt } from "@jupyterlab/coreutils";

import { VerNotebook, log } from "../notebook";

import { Contents, ContentsManager } from "@jupyterlab/services";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { OutputHistory } from "../history/";

import * as nbformat from "@jupyterlab/nbformat";

export class FileManager {
  readonly docManager: IDocumentManager;
  private _activeNotebook: VerNotebook;

  constructor(docManager: IDocumentManager) {
    this.docManager = docManager;
  }

  public set activeNotebook(notebook: VerNotebook) {
    this._activeNotebook = notebook;
  }

  public writeToFile(): Promise<void> {
    return new Promise((accept, reject) => {
      var notebookPath = this._activeNotebook.path;
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
        JSON.stringify(this._activeNotebook.history.toJSON(), null, 1)
      );
      //log("Model to save is", saveModel)

      let contents = new ContentsManager();
      contents
        .save(path, saveModel)
        .then(() => {
          log("Model written to file", saveModel);
          accept();
        })
        .catch((rej) => {
          //here when you reject the promise if the filesave fails
          console.error(rej);
          reject();
        });
    });
  }

  public loadFromFile(notebook: VerNotebook): Promise<any> {
    return new Promise((accept) => {
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
        .then((res) => {
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

  public async getOutput(
    output: OutputHistory.Offsite
  ): Promise<nbformat.IOutput> {
    var path = this.getOutputPath() + "/" + output.offsite;
    let contents = new ContentsManager();
    let fileDat;
    try {
      fileDat = await contents.get(path);
    } catch (error) {
      // file is missing, that's ok.
    }
    let retrieved: nbformat.IDisplayData = {
      output_type: "display_data",
      data: {},
      metadata: {
        verdant_trust_plz: true,
        isolated: true,
      },
    };

    if (fileDat) {
      retrieved.data[`image/${output.fileType}`] = fileDat.content + "";
    } else {
      retrieved.data["image/svg+xml"] = MISSING_IMAGE_SVG;
    }

    return retrieved;
  }

  public writeOutput(filename: string, data: string) {
    this.makeOutputFolder();
    var path = this.getOutputPath() + "/" + filename;
    var saveModel = new HistorySaveModel(
      filename,
      path,
      "today",
      "today",
      data
    );
    let contents = new ContentsManager();
    this.makeOutputFolder().then(() => contents.save(path, saveModel));
  }

  private getOutputPath() {
    let name = this._activeNotebook.name;
    return "./" + name.substring(0, name.indexOf(".")) + "_output";
  }

  private makeOutputFolder() {
    let path = this.getOutputPath();
    let name = path.substring(2);
    let contents = new ContentsManager();
    return contents.save(path, {
      path,
      name,
      type: "directory",
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

export class OutputSaveModel implements Contents.IModel {
  readonly type: Contents.ContentType = "file";
  readonly writable: boolean = true;
  readonly mimetype: string = null;
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

const MISSING_IMAGE_SVG = `<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 24 29"
aria-labelledby="title"
className="verdant-icon-missingImage"
>
<title id="title">Missing Image Icon</title>
<g>
  <circle cx="6" cy="11" r="2" />
  <path d="M17.908 5l-.593 2H22v15h-9.129l-.593 2H24V5z" />
  <path d="M13.167 21H21v-2.857c-1.997-2.776-2.954-6.657-4.883-7.098L13.167 21zM15.041.716L13.771 5H0v19h8.143l-1.102 3.716 1.918.568 8-27-1.918-.568zM10.31 16.682c-.668-.861-1.34-1.396-2.06-1.396-1.955 0-2.674 4.157-5.25 4.999V21H9.031l-.296 1H2V7h11.18l-2.87 9.682z" />
</g>
</svg>`;
