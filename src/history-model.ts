import {
  Nodey,
  NodeyCell,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyOutput
} from "./nodey";

import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { RunModel } from "./run-model";

import { Inspect } from "./inspect";

import { serialized_NodeyList } from "./file-manager";

export class HistoryModel {
  constructor(renderBaby: RenderBaby) {
    this._inspector = new Inspect(this, renderBaby);
    this._runModel = new RunModel(this);
  }

  private _inspector: Inspect;
  private _runModel: RunModel;
  private _notebook: NotebookListen;

  private _nodeyStore: NodeHistory[] = [];
  private _cellList: number[] = [];
  private _outputStore: NodeHistory[] = [];
  //TODO private _deletedCellList: number[] = [];

  set notebook(notebook: NotebookListen) {
    this._notebook = notebook;
    this._inspector.notebook = this._notebook;
  }

  get notebook() {
    return this._notebook;
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

  getNodeyHead(name: string): Nodey {
    var [id, ver, tag] = name.split(".");
    var nodeHist = this._nodeyStore[parseInt(id)];

    if (id === "*" && tag) {
      var cell = this.getNodeyCell(parseInt(ver));
      return cell.starNodes[parseInt(tag)];
    }

    if (ver === "*") return nodeHist.starNodey;

    return nodeHist.versions[nodeHist.versions.length - 1];
  }

  getNodeyCell(id: number): NodeyCell {
    var nodeHist = this._nodeyStore[id];
    return <NodeyCell>nodeHist.latest;
  }

  getNodey(name: string): Nodey {
    var [id, ver, tag] = name.split(".");
    if (id === "*" && tag) {
      var cell = this.getNodeyCell(parseInt(ver));
      return cell.starNodes[parseInt(tag)];
    }
    return this._nodeyStore[parseInt(id)].versions[parseInt(ver)];
  }

  getOutput(name: string): NodeyOutput {
    var [id, ver] = name.split(".");
    var nodeHist = this._outputStore[parseInt(id)];
    return nodeHist.versions[parseInt(ver)] as NodeyOutput;
  }

  handleCellRun(executionCount: number, nodey: NodeyCell) {
    this._runModel.cellRun(executionCount, nodey);
  }

  public registerNodey(nodey: Nodey): void {
    var id = this._nodeyStore.push(new NodeHistory()) - 1;
    nodey.id = id;
    var version = this._nodeyStore[nodey.id].versions.push(nodey) - 1;
    nodey.version = version;
    return;
  }

  public registerCellNodey(nodey: NodeyCell): void {
    this.registerNodey(nodey);
    this._cellList.push(nodey.id); //TODO cells change order, deleted, ect
  }

  public registerOutputNodey(nodey: NodeyOutput) {
    var id = this._outputStore.push(new NodeHistory()) - 1;
    nodey.id = id;
    var version = this._outputStore[nodey.id].versions.push(nodey) - 1;
    nodey.version = version;
    return;
  }

  public stageChanges(transforms: ((key: any) => any)[], nodey: Nodey): void {
    var history = this.getVersionsFor(nodey);
    this._stageChanges(transforms, history);
  }

  private _stageChanges(changes: ((x: Nodey) => void)[], history: NodeHistory) {
    if (!history.starNodey) {
      //newly entering star state!
      var nodey = history.versions[history.versions.length - 1];
      history.starNodey = nodey.clone();
      history.starNodey.version = "*";
      if (history.starNodey.parent) {
        // star all the way up the chain
        var transforms = [
          (x: NodeyCode) =>
            (x.content[x.content.indexOf(nodey.name)] = history.starNodey.name)
        ];
        var parent = this.getNodeyHead(history.starNodey.parent);
        this.stageChanges(transforms, parent);
      }
    }
    changes.forEach((fun: (x: Nodey) => void) => fun(history.starNodey));
  }

  public addStarNode(starNode: NodeyCode, relativeTo: NodeyCode): string {
    var cell = this._getCellParent(relativeTo);
    cell.starNodes.push(starNode);
    var num = cell.starNodes.length;
    return cell.id + "." + num;
  }

  private _getCellParent(relativeTo: NodeyCode): NodeyCodeCell {
    if (relativeTo instanceof NodeyCodeCell) return relativeTo;
    else if (relativeTo.parent)
      return this._getCellParent(this.getNodey(relativeTo.parent) as NodeyCode);
  }

  public commitChanges(cell: NodeyCell) {
    if (cell instanceof NodeyCodeCell)
      this._commitCode(cell, this._deStar.bind(this));
    else if (cell instanceof NodeyMarkdown) this._commitMarkdown(cell);

    cell.starNodes = [];
  }

  private _deStar(nodey: Nodey) {
    var newNodey = nodey.clone();
    this.registerNodey(nodey);
    return newNodey;
  }

  private _commitMarkdown(nodey: NodeyMarkdown) {
    if (nodey.version === "*") {
      var history = this.getVersionsFor(nodey);
      return history.deStar() as NodeyCode;
    }
  }

  private _commitCode(
    nodey: NodeyCode,
    starFactory: (x: NodeyCode) => NodeyCode,
    prior: NodeyCode = null
  ): NodeyCode {
    var newNodey: NodeyCode;
    if (nodey.id === "*") newNodey = starFactory(newNodey);
    else if (nodey.version === "*") {
      var history = this.getVersionsFor(nodey);
      newNodey = history.deStar() as NodeyCode;
    } else return nodey; // nothing to change, stop update here

    if (prior) prior.right = newNodey.name;
    prior = null;

    newNodey.content.forEach((childName: string, index: number) => {
      var [id, ver] = childName.split(".");
      if (id === "*" || ver === "*") {
        // only update children that are changed
        var child = this.getNodey(childName) as NodeyCode;
        child = this._commitCode(child, starFactory, prior);
        newNodey.content[index] = child.name;
        child.parent = newNodey.name;
        if (prior) prior.right = child.name;
        prior = child;
      }
    });

    return newNodey;
  }

  toJSON(): serialized_NodeyList[] {
    return this._nodeyStore.map((history: NodeHistory, index: number) => {
      if (history) {
        var versions = history.versions.map((item: Nodey) => item.toJSON());
        var nodey = index;
        return { versions: versions, nodey: nodey };
      }
    });
  }

  dump(): void {
    //for debugging only
    console.log(
      "CELLS",
      this._cellList,
      "NODES",
      this._nodeyStore,
      "OUTPUT",
      this._outputStore
    );
  }
}

/*
* Just a container for a list of nodey versions
*/
export class NodeHistory {
  versions: Nodey[] = [];
  starNodey: Nodey = null;

  get latest() {
    if (this.starNodey !== null) return this.starNodey;
    return this.versions[this.versions.length - 1];
  }

  deStar() {
    var newNodey = this.starNodey.clone();
    this.starNodey = null;
    this.versions.push(newNodey);
    newNodey.version = this.versions.length - 1;
    return newNodey;
  }
}
