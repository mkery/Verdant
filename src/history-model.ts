import { Nodey, NodeyCode, NodeyCell } from "./nodey";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { RunModel } from "./run-model";

import { Inspect } from "./inspect";

import { serialized_NodeyList } from "./file-manager";

export class HistoryModel {
  constructor(startCount: number = 0, renderBaby: RenderBaby) {
    this._nodeyCounter = startCount;
    this._inspector = new Inspect(this, renderBaby);
    this._runModel = new RunModel(this);
  }

  private _notebook: NotebookListen;
  private _inspector: Inspect;
  private _runModel: RunModel;

  private _nodeyCounter = 0;
  private _nodeyStore: NodeyVersionList[] = [];
  private _cellList: number[] = [];
  //TODO private _deletedCellList: number[] = [];
  private _starNodes: Nodey[] = []; // new nodes that haven't been commited & subsequently indexed yet

  set notebook(notebook: NotebookListen) {
    console.log("NOTEBOOK SET TO", notebook);
    this._notebook = notebook;
    this._inspector.notebook = this._notebook;
  }

  get inspector(): Inspect {
    return this._inspector;
  }

  get runModel(): RunModel {
    return this._runModel;
  }

  get cellList(): NodeyCell[] {
    return this._cellList.map(num => this.getNodeyCell(num));
  }

  public getVersionsFor(nodey: Nodey) {
    return this._nodeyStore[parseInt(nodey.id)];
  }

  dispenseNodeyID(): number {
    var id = this._nodeyCounter;
    this._nodeyCounter++;
    return id;
  }

  getNodeyHead(name: string): Nodey {
    //TODO seperate list for markdown and output
    var [id, ver] = name.split(".");
    if (id === "*")
      // its not a committed node yet
      return this._starNodes[parseInt(ver)];

    return this._nodeyStore[parseInt(id)].getNodeyHead();
  }

  getNodeyCell(id: number): NodeyCell {
    return <NodeyCell>this._nodeyStore[id].getNodeyHead();
  }

  getNodey(name: string): Nodey {
    var [id, ver] = name.split(".");
    if (id === "*")
      // its not a committed node yet
      return this._starNodes[parseInt(ver)];
    return this._nodeyStore[parseInt(id)].getNodey(ver);
  }

  handleCellRun(executionCount: number, nodey: NodeyCell) {
    this._runModel.cellRun(executionCount, nodey);
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

  registerCellNodey(nodey: NodeyCell): number {
    var version = this.registerNodey(nodey);
    this._cellList.push(nodey.id); //TODO cells change order, deleted, ect
    return version;
  }

  registerStarNodey(nodey: Nodey): number {
    this._starNodes.push(nodey);
    var version = this._starNodes.length - 1;
    return version;
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
          prior = child as NodeyCode;
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
        if (n instanceof NodeyCode && n.parent) {
          var parent = this.getNodeyHead(n.parent) as NodeyCode;
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
}

export class NodeyVersionList {
  historyModel: HistoryModel;

  private _verList: Nodey[];
  private _number: number;
  private _starState: Nodey;

  constructor(historyModel: HistoryModel, index: number) {
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

  public getNodeyHead(): Nodey {
    if (this._starState) return this._starState;
    else return this.getNodey(this._verList.length - 1);
  }

  public getNodey(index: any): Nodey {
    if (index === "*") return this._starState;

    return this._verList[parseInt(index)];
  }

  public starNodey(
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
