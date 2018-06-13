import { Nodey, NodeyCode, serialized_Nodey } from "./nodey";

import { PathExt } from "@jupyterlab/coreutils";

import { NotebookListen } from "./notebook-listen";

import { Contents, ContentsManager } from "@jupyterlab/services";

import { RunRecord, Run, CellRunData } from "./run";

import { Signal } from "@phosphor/signaling";

import { Inspect } from "./inspect";

export class Model {
  constructor(startCount: number = 0) {
    this._nodeyCounter = startCount;
    this._runStore = new RunRecord();
    this._inspector = new Inspect(this);
  }

  private _notebook: NotebookListen;
  private _inspector: Inspect;

  private _nodeyCounter = 0;
  private _nodeyStore: NodeyVersionList[] = [];
  private _runStore: RunRecord;
  private _starNodes: Nodey[] = []; // new nodes that haven't been commited & subsequently indexed yet
  private _newRun = new Signal<this, Run>(this);

  set notebook(notebook: NotebookListen) {
    console.log("NOTEBOOK SET TO", notebook);
    this._notebook = notebook;
    this._inspector.notebook = notebook;
  }

  get inspector(): Inspect {
    return this._inspector;
  }

  get runs(): { date: number; runs: Run[] }[] {
    return this._runStore.runs;
  }

  get newRun(): Signal<Model, Run> {
    return this._newRun;
  }

  dispenseNodeyID(): number {
    var id = this._nodeyCounter;
    this._nodeyCounter++;
    return id;
  }

  getNodeyHead(name: string): NodeyCode {
    //TODO seperate list for markdown and output
    var [id, ver] = name.split(".");
    if (id === "*")
      // its not a committed node yet
      return <NodeyCode>this._starNodes[parseInt(ver)];

    return <NodeyCode>this._nodeyStore[parseInt(id)].getNodeyHead();
  }

  getNodey(name: string): NodeyCode {
    var [id, ver] = name.split(".");
    if (id === "*")
      // its not a committed node yet
      return <NodeyCode>this._starNodes[parseInt(ver)];
    return <NodeyCode>this._nodeyStore[parseInt(id)].getNodey(ver);
  }

  starNodey(
    changes: ((x: Nodey) => void)[],
    nodey: Nodey // if a Node is in star state, it's got changes that have not been commited
  ) {
    if (nodey.id === "*") {
      // its not a committed node yet so we can directly apply the changes
      changes.forEach((fun: (x: Nodey) => void) => fun(nodey));
    } else this._nodeyStore[nodey.id].starNodey(changes, nodey);
  }

  registerNodey(nodey: Nodey): number {
    this._nodeyStore[nodey.id] = new NodeyVersionList(this, nodey.id);
    var version = this._nodeyStore[nodey.id].addNodey(nodey);
    return version;
  }

  registerStarNodey(nodey: Nodey): number {
    this._starNodes.push(nodey);
    var version = this._starNodes.length - 1;
    return version;
  }

  registerRun(time: number, cells: CellRunData[]): Run {
    return this._runStore.addNewRun(time, cells);
  }

  cellRun(execCount: number, nodey: NodeyCode) {
    console.log("Cell run!", execCount, nodey);
    var timestamp = Date.now();
    if (execCount !== null) {
      this.commitChanges(nodey);
      this.pruneStarList();
      this.dump();
      var cellDat: CellRunData[] = [];
      this._notebook.cells.forEach(cell => {
        var dat = {
          node: cell.nodeyName,
          changeType: cell.status
        } as CellRunData;
        if (cell.nodeyName === nodey.name) dat["run"] = true;
        cellDat.push(dat);
        cell.clearStatus();
      });
      var run = this.registerRun(timestamp, cellDat);
      console.log("Run committed ", run);
      this._newRun.emit(run);
    }
  }

  commitChanges(nodey: Nodey, prior: NodeyCode = null): Nodey {
    //console.log("commiting ", nodey)
    if (nodey.id === "*") var newNodey = this.clearStar(nodey);
    else if (nodey.version === "*")
      var newNodey = this._nodeyStore[parseInt(nodey.id)].commitChanges();

    if (newNodey instanceof NodeyCode) {
      var codey: NodeyCode = newNodey;
      if (prior) prior.right = codey.name;
      prior = null;

      codey.content.forEach((childName, index) => {
        var [id, ver] = childName.split(".");
        if (id === "*" || ver === "*") {
          // only update children that are changed
          var child = this.getNodey(childName);
          child = <NodeyCode>this.commitChanges(child, prior);
          codey.content[index] = child.name;
          child.parent = codey.name;
          if (prior) prior.right = child.name;
          prior = child;
        }
      });
    }

    //console.log("Now", newNodey)
    return newNodey;
  }

  clearStar(nodey: Nodey) {
    var starIndex = nodey.version;
    nodey = this._starNodes[starIndex].clone();
    this._starNodes[starIndex] = undefined;
    var newID = this.dispenseNodeyID();
    nodey.id = newID;
    nodey.version = this.registerNodey(nodey);
    return nodey;
  }

  pruneStarList() {
    var acc: Nodey[] = [];
    this._starNodes.map(n => {
      if (n) {
        acc.push(n);
        var oldName = n.name;
        n.version = acc.length - 1;
        if (n.parent) {
          var parent = this.getNodeyHead(n.parent);
          parent.content[parent.content.indexOf(oldName)] = n.name;
        }
      }
    });

    this._starNodes = acc;
  }

  toJSON(): serialized_NodeyList[] {
    return this._nodeyStore.map((item: NodeyVersionList) => {
      if (item) return item.toJSON();
    });
  }

  dump(): void {
    //for debugging only
    console.log(this._starNodes, this._nodeyStore);
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
        JSON.stringify(this.toJSON())
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

export class NodeyVersionList {
  historyModel: Model;

  private _verList: Nodey[];
  private _number: number;
  private _starState: Nodey;

  constructor(historyModel: Model, index: number) {
    this.historyModel = historyModel;
    this._verList = [];
    this._number = index;
  }

  addNodey(nodey: Nodey): number {
    this._verList.push(nodey);
    return this._verList.length - 1;
  }

  get history(): Nodey[] {
    return this._verList;
  }

  getNodeyHead(): Nodey {
    if (this._starState) return this._starState;
    else return this.getNodey(this._verList.length - 1);
  }

  getNodey(index: any): Nodey {
    if (index === "*") return this._starState;

    return this._verList[parseInt(index)];
  }

  starNodey(
    changes: ((x: Nodey) => void)[],
    nodey: Nodey = this._verList[this._verList.length - 1]
  ) {
    if (!this._starState) {
      //newly entering star state!
      this._starState = nodey.clone();
      this._starState.version = "*";
      if (this._starState.parent) {
        // star all the way up the chain
        var transforms = [
          (x: NodeyCode) =>
            (x.content[x.content.indexOf(nodey.name)] = this._starState.name)
        ];
        var parent = this.historyModel.getNodeyHead(this._starState.parent);
        this.historyModel.starNodey(transforms, parent);
      }
    }
    changes.forEach((fun: (x: Nodey) => void) => fun(this._starState));
  }

  commitChanges(): Nodey {
    if (this._starState) {
      var nodey = this._starState.clone();
      this._starState = null;
      var newVersion = this.addNodey(nodey);
      nodey.version = newVersion;
      return nodey;
    }
  }

  toJSON(): serialized_NodeyList {
    var versions = this._verList.map(item => item.toJSON());
    var jsn: serialized_NodeyList = { nodey: this._number, versions: versions };
    return jsn;
  }
}

export interface serialized_NodeyList {
  nodey: number;
  versions: serialized_Nodey[];
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
