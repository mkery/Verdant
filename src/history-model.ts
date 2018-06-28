import {
  Nodey,
  NodeyCell,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken
} from "./nodey";

import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { RunModel } from "./run-model";

import { Inspect } from "./inspect";

import { FileManager } from "./file-manager";

import {
  serialized_NodeyHistory,
  serialized_Nodey,
  serialized_NodeyOutput
} from "./file-manager";

import { CodeCell } from "@jupyterlab/cells";

export class HistoryModel {
  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Inspect(this, renderBaby);
    this.fileManager = fileManager;
    this._runModel = new RunModel(this);
  }

  private _inspector: Inspect;
  readonly fileManager: FileManager;
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
    if (nodey instanceof NodeyOutput)
      return this._outputStore[parseInt(nodey.id)];
    return this._nodeyStore[parseInt(nodey.id)];
  }

  getNodeyHead(name: string): Nodey {
    let [id, ver, tag] = name.split(".");

    if (id === "*" && tag) {
      let cell = this.getNodeyCell(parseInt(ver));
      console.log("looking for a star node ", name, cell);
      return cell.starNodes[parseInt(tag) - 1];
    }

    let nodeHist = this._nodeyStore[parseInt(id)];
    if (ver === "*") return nodeHist.starNodey;

    return nodeHist.versions[nodeHist.versions.length - 1];
  }

  getNodeyCell(id: number): NodeyCell {
    let nodeHist = this._nodeyStore[id];
    return <NodeyCell>nodeHist.latest;
  }

  getNodey(name: string): Nodey {
    let [id, ver, tag] = name.split(".");
    if (id === "*" && tag) {
      let cell = this.getNodeyCell(parseInt(ver));
      console.log("looking for a star node ", name, cell);
      return cell.starNodes[parseInt(tag) - 1];
    }

    if (ver === "*") return this._nodeyStore[parseInt(id)].starNodey;

    return this._nodeyStore[parseInt(id)].versions[parseInt(ver)];
  }

  getOutput(name: string): NodeyOutput {
    let [id, ver] = name.split(".");
    let nodeHist = this._outputStore[parseInt(id)];
    return nodeHist.versions[parseInt(ver)] as NodeyOutput;
  }

  getPriorVersion(nodey: Nodey) {
    if (nodey.version !== 0) {
      let nodeHist = this._nodeyStore[nodey.id];
      return nodeHist.versions[nodey.version - 1];
    }
  }

  handleCellRun(executionCount: number, nodey: NodeyCell) {
    this._runModel.cellRun(executionCount, nodey);
  }

  public registerNodey(nodey: Nodey): void {
    let id = this._nodeyStore.push(new NodeHistory()) - 1;
    nodey.id = id;
    let version = this._nodeyStore[nodey.id].versions.push(nodey) - 1;
    nodey.version = version;
    return;
  }

  public registerCellNodey(nodey: NodeyCell, position: number): void {
    this.registerNodey(nodey);
    this._cellList[position] = nodey.id; //TODO cells change order, deleted, ect
  }

  public registerOutputNodey(nodey: NodeyOutput) {
    let id = this._outputStore.push(new NodeHistory()) - 1;
    nodey.id = id;
    let version = this._outputStore[nodey.id].versions.push(nodey) - 1;
    nodey.version = version;
    return;
  }

  public stageChanges(transforms: ((key: any) => any)[], nodey: Nodey): void {
    let history = this.getVersionsFor(nodey);
    this._stageChanges(transforms, history);
  }

  private _stageChanges(changes: ((x: Nodey) => void)[], history: NodeHistory) {
    if (!history.starNodey) {
      //newly entering star state!
      let nodey = history.versions[history.versions.length - 1];
      history.starNodey = nodey.clone();
      history.starNodey.version = "*";
      if (history.starNodey.parent) {
        // star all the way up the chain
        let transforms = [
          (x: NodeyCode) =>
            (x.content[x.content.indexOf(nodey.name)] = history.starNodey.name)
        ];
        let parent = this.getNodeyHead(history.starNodey.parent);
        this.stageChanges(transforms, parent);
      }
    }
    changes.forEach((fun: (x: Nodey) => void) => fun(history.starNodey));
  }

  public addStarNode(starNode: NodeyCode, relativeTo: NodeyCode): string {
    let cell = this._getCellParent(relativeTo);
    cell.starNodes.push(starNode);
    let num = cell.starNodes.length;
    return cell.id + "." + num;
  }

  private _getCellParent(relativeTo: NodeyCode): NodeyCodeCell {
    if (relativeTo instanceof NodeyCodeCell) return relativeTo;
    else if (relativeTo.parent)
      return this._getCellParent(this.getNodey(relativeTo.parent) as NodeyCode);
  }

  public commitChanges(cell: NodeyCell, runId: number) {
    console.log("Cell to commit is " + cell.name, cell, runId);
    if (cell instanceof NodeyCodeCell) {
      let output = this._commitOutput(cell, runId);
      this._commitCode(cell, runId, output, this._deStar.bind(this));
    } else if (cell instanceof NodeyMarkdown) this._commitMarkdown(cell, runId);

    cell.starNodes = [];
  }

  private _deStar(nodey: Nodey, runId: number, output: string[]) {
    let newNodey = nodey.clone();
    if (newNodey instanceof NodeyCode && output)
      newNodey.addOutput(runId, output);
    newNodey.run.push(runId);
    this.registerNodey(newNodey);
    console.log("star node now ", newNodey);
    return newNodey;
  }

  private _commitMarkdown(nodey: NodeyMarkdown, runId: number) {
    if (nodey.version === "*") {
      let history = this.getVersionsFor(nodey);
      return history.deStar(runId) as NodeyMarkdown;
    }
  }

  private _commitOutput(nodey: NodeyCodeCell, runId: number) {
    let latestOutput = nodey.latestOutput;
    let output = null;
    if (latestOutput) output = latestOutput.map(o => this.getOutput(o));
    return Nodey.outputToNodey(
      nodey.cell.cell as CodeCell,
      this,
      output,
      runId
    );
  }

  private _commitCode(
    nodey: NodeyCode,
    runId: number,
    output: string[],
    starFactory: (x: NodeyCode, num: number, out: string[]) => NodeyCode,
    prior: NodeyCode = null
  ): NodeyCode {
    console.log("Commiting code", nodey);
    if (prior) prior.right = nodey.name;
    prior = null;

    nodey.content.forEach((childName: any, index: number) => {
      if (!(childName instanceof SyntaxToken)) {
        //skip syntax tokens
        let [id, ver] = childName.split(".");
        if (id === "*" || ver === "*") {
          // only update children that are changed
          let child = this.getNodey(childName) as NodeyCode;
          console.log("getting " + childName, child);
          child = this._commitCode(child, runId, output, starFactory, prior);
          nodey.content[index] = child.name;
          child.parent = nodey.name;
          if (prior) prior.right = child.name;
          prior = child;
        }
      }
    });

    let newNodey: NodeyCode;
    if (nodey.id === "*") newNodey = starFactory(nodey, runId, output);
    else if (nodey.version === "*") {
      let history = this.getVersionsFor(nodey);
      newNodey = history.deStar(runId, output) as NodeyCode;
    } else {
      return nodey; // nothing to change, stop update here
    }

    return newNodey;
  }

  toJSON(): serialized_NodeyHistory {
    var jsn = {
      runs: this._runModel.toJSON(),
      cells: this._cellList
    } as serialized_NodeyHistory;
    jsn["nodey"] = this._nodeyStore.map(
      (history: NodeHistory, index: number) => {
        if (history) {
          let versions = history.versions.map((item: Nodey) => item.toJSON());
          let nodey = index;
          return { nodey: nodey, versions: versions };
        }
      }
    ) as { nodey: number; versions: serialized_Nodey[] }[];
    jsn["output"] = this._outputStore.map(
      (history: NodeHistory, index: number) => {
        if (history) {
          let versions = history.versions.map((item: Nodey) => item.toJSON());
          let nodey = index;
          return { versions: versions, output: nodey };
        }
      }
    ) as { output: number; versions: serialized_NodeyOutput[] }[];
    return jsn;
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

  deStar(runId: number, output: string[] = null) {
    let newNodey = this.starNodey.clone();
    newNodey.run.push(runId);
    if (newNodey instanceof NodeyCode && output)
      newNodey.addOutput(runId, output);
    this.starNodey = null;
    this.versions.push(newNodey);
    newNodey.version = this.versions.length - 1;
    console.log("de-staring", newNodey, this);
    return newNodey;
  }
}
