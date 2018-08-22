import { NodeyCell, NodeyCode } from "./nodey";
import { Signal } from "@phosphor/signaling";
import { HistoryModel } from "./history";
import { serialized_Run } from "../file-manager";

/*
*
*/
export class RunModel {
  readonly historyModel: HistoryModel;

  private _runList: Run[];
  private _newRunDate = new Signal<this, RunDate>(this);
  private _dateList: RunDate[];
  private _clusterList: RunCluster[];

  constructor(historyModel: HistoryModel) {
    this.historyModel = historyModel;

    this._runList = [];
    this._dateList = [];
    this._clusterList = [];
  }

  public getRun(id: number): Run {
    return this._runList[id];
  }

  public getCluster(id: number): RunCluster {
    return this._clusterList[id];
  }

  get runDateList() {
    return this._dateList;
  }

  get runClusterList() {
    return this._clusterList;
  }

  get newRunDate(): Signal<RunModel, RunDate> {
    return this._newRunDate;
  }

  public async cellRun(nodey: NodeyCell) {
    console.log("Cell run!", nodey);
    let runID = this._runList.length;
    let timestamp = Date.now();
    let newNodey = this.historyModel.commitChanges(nodey, runID);

    let notebook = this.historyModel.cellList.map(nodeyCell => nodeyCell.name);

    let newOutput: string[] = [];
    if (newNodey instanceof NodeyCode) {
      let out = newNodey.getOutput();
      for (let i = out.length - 1; i > -1; i--) {
        let output = this.historyModel.getOutput(out[i]);
        if (output.run.indexOf(runID) > -1) newOutput.push(output.name);
        else break;
      }
    }

    let runCell = {
      node: newNodey.name,
      changeType: newNodey.cell.status + 0,
      run: true,
      newOutput: newOutput
    } as CellRunData;
    this.historyModel.clearCellStatus(newNodey);

    let run = new Run({ id: runID, timestamp, notebook, runCell, newOutput });
    this._runList[runID] = run;

    console.log("Run committed ", run, newNodey);
    this.categorizeRun(run);
    this.historyModel.writeToFile();
  }

  private categorizeRun(run: Run) {
    if (run.cluster !== -1) {
      let cluster = this._clusterList[run.cluster];
      if (!cluster) cluster = this.buildNewCluster(run, run.cluster);
    } else {
      let cluster = this._clusterList[
        Math.max(0, this._clusterList.length - 1)
      ];
      if (!cluster) this.buildNewCluster(run);
      else {
        let admit = cluster.canAdmit(run);
        if (admit) cluster.addRun(run);
        if (!admit) this.buildNewCluster(run);
      }
    }
  }

  private categorizeCluster(cluster: RunCluster) {
    let latestDate = this._dateList[Math.max(0, this._dateList.length - 1)];
    if (!latestDate) latestDate = this.buildNewDate(cluster);
    else {
      let admit = latestDate.canAdmit(cluster);
      if (admit) latestDate.addCluster(cluster);
      else this.buildNewDate(cluster);
    }
  }

  private buildNewCluster(run: Run, id: number = -1) {
    if (id === -1) id = this._clusterList.length;
    let cluster = new RunCluster(id, this, [run.id]);
    this._clusterList[id] = cluster;
    this.categorizeCluster(cluster);
    return cluster;
  }

  private buildNewDate(cluster: RunCluster) {
    let date = cluster.date;
    let id = this._dateList.length;
    let runDate = new RunDate(id, date, this, [cluster.id]);
    this._dateList[id] = runDate;
    this._newRunDate.emit(runDate);
    return runDate;
  }

  public fromJSON(data: serialized_Run[]) {
    data.map((run: serialized_Run, index: number) => {
      let checkpointType = run[0] as string;
      let timestamp = run[1] as number;
      let cluster = run[2] as number;
      let newOutput = run[3] as string[];
      let runCell: CellRunData = null;
      //console.log("data", data);
      let notebook = run.slice(4).map((name: string | CellRunData) => {
        if (name instanceof String || typeof name === "string") return name;
        else {
          runCell = name;
          return runCell.node;
        }
      });
      var r = new Run({
        id: index,
        checkpointType: checkpointType,
        timestamp: timestamp,
        cluster: cluster,
        notebook: notebook,
        runCell: runCell,
        newOutput: newOutput
      });
      this._runList[r.id] = r;
      this.categorizeRun(r);
    });
    console.log("RUNS FROM JSON", this._dateList);
  }

  public toJSON(): serialized_Run[] {
    return this._runList.map(run => {
      return run.toJSON();
    });
  }
}

export namespace ChangeType {
  export const CHANGED = 2;
  export const REMOVED = 1.5;
  export const ADDED = 1;
  export const SAME = 0;
}

export interface CellRunData {
  node: string;
  changeType: number;
  run?: boolean;
  newOutput?: string[];
}

export namespace CheckpointType {
  export const RUN = "run";
  export const SAVE = "save";
}

export class Run {
  readonly timestamp: number;
  readonly id: number;
  readonly notebook: string[];
  readonly runCell: CellRunData;
  readonly newOutput: string[];
  readonly checkpointType: string;

  cluster: number = -1;
  note: number = -1;
  star: number = -1;

  //runID, timestamp, notebook, runCells, output
  constructor(options: { [key: string]: any }) {
    this.timestamp = options.timestamp;
    this.id = options.id;
    this.checkpointType = options.checkpointType || CheckpointType.RUN;

    this.notebook = options.notebook;
    this.runCell = options.runCell;
    this.newOutput = options.newOutput;
  }

  public get name() {
    return this.id + "";
  }

  public toJSON(): serialized_Run {
    let meta: (string | number | CellRunData | string[])[] = [
      this.checkpointType,
      this.timestamp,
      this.cluster,
      this.newOutput
    ];
    this.notebook.forEach(name => {
      if (name === this.runCell.node) meta.push(this.runCell);
      else meta.push(name);
    });
    return meta;
  }

  public getCellMap() {
    let map: CellRunData[] = [];
    this.notebook.forEach((name: string, index: number) => {
      if (this.runCell.node === name) map[index] = this.runCell;
      else map[index] = { node: name, changeType: ChangeType.SAME };
    });
    return map;
  }
}

export class RunCluster {
  readonly model: RunModel;
  readonly id: number;
  private _runs: number[];
  private _cluster: number;
  private _newRunAdded = new Signal<this, Run>(this);

  constructor(id: number, model: RunModel, runList: number[] = []) {
    this._runs = runList;
    this.model = model;
    this.id = id;
  }

  public get cluster() {
    return this._cluster;
  }

  public get newRunAdded() {
    return this._newRunAdded;
  }

  public get checkpointType() {
    return this.getRun(this._runs[0]).checkpointType;
  }

  public get length() {
    return this._runs.length;
  }

  public get first() {
    let run = this._runs[0];
    return this.getRun(run);
  }

  public get last() {
    let run = this._runs[Math.max(0, this._runs.length - 1)];
    return this.getRun(run);
  }

  public indexOf(run: number) {
    return this._runs.indexOf(run);
  }

  public get date() {
    let run = this.getRun(this._runs[0]);
    let date = new Date(run.timestamp);
    date.setHours(12, 0, 0);
    return date;
  }

  public addRun(r: Run) {
    this._runs.push(r.id);
    r.cluster = this.id;
    this._newRunAdded.emit(r);
  }

  public getRunList() {
    return this._runs;
  }

  private getRun(id: number) {
    return this.model.getRun(id);
  }

  public canAdmit(r: Run) {
    if (this._runs.length === 0) return true;
    else
      return this._runs.every((i: number) => {
        let member = this.model.getRun(i);
        return (
          r.runCell &&
          (r.runCell.node !== member.runCell.node ||
            r.runCell.changeType === member.runCell.changeType) &&
          r.runCell.changeType !== ChangeType.REMOVED &&
          r.runCell.changeType !== ChangeType.ADDED &&
          member.runCell.changeType !== ChangeType.REMOVED &&
          member.runCell.changeType !== ChangeType.ADDED &&
          member.checkpointType === r.checkpointType &&
          Run.sameMinute(new Date(member.timestamp), new Date(r.timestamp))
        );
      });
  }

  public filter(fun: (r: Run) => boolean): number {
    let matchCount = 0;
    this._runs.forEach((i: number) => {
      let member = this.model.getRun(i);
      if (fun(member)) matchCount += 1;
    });
    return matchCount;
  }

  public filterByText(
    keyword: string,
    otherFilters: (r: Run) => boolean
  ): number {
    let keys = keyword.toLowerCase().split(" ");

    let fun = (t: string) => {
      return keys.every((k: string) => t.indexOf(k) > -1);
    };
    let nodesMemo: { node: string; match: boolean }[][] = [];
    let matches: number = 0;
    this._runs.forEach((i: number) => {
      let member = this.model.getRun(i);
      if (!otherFilters || otherFilters(member)) {
        let nodeList = [member.runCell.node];
        nodeList.forEach(name => {
          let match = null;
          let node = this.model.historyModel.getNodey(name);
          if (!node) return; //error case only TODO
          let id = parseInt(node.id);
          if (nodesMemo[id]) {
            let memo = nodesMemo[id].find(item => item.node === name);
            if (memo) return;
          }
          if (match === null) {
            // no memo found
            let text = this.model.historyModel.inspector
              .renderNode(node)
              .text.toLowerCase();
            match = fun(text);
            console.log("RENDERED", match, text);
            if (!nodesMemo[id]) nodesMemo[id] = [];
            nodesMemo[id].push({ node: name, match: match });
            if (match) matches += 1;
          }
        });
      }
    });
    return matches;
  }

  public getCellMap() {
    let map: CellRunData[] = [];
    this._runs.forEach((id: number) => {
      let run = this.getRun(id);
      let runCell = run.runCell;
      run.notebook.forEach((name: string, index: number) => {
        if (runCell.node === name) map[index] = runCell;
        else if (!map[index])
          map[index] = { node: name, changeType: ChangeType.SAME };
      });
    });
    return map;
  }
}

export class RunDate {
  readonly model: RunModel;
  readonly id: number;
  private _date: Date;
  private _clusters: number[];
  private _newClusterAdded = new Signal<this, RunCluster>(this);

  constructor(
    id: number,
    date: Date,
    model: RunModel,
    clusters: number[] = []
  ) {
    this.id = id;
    this.model = model;
    this._clusters = clusters;
    this._date = date;
  }

  get date() {
    return this._date;
  }

  public get newClusterAdded() {
    return this._newClusterAdded;
  }

  public addCluster(r: RunCluster) {
    this._clusters.push(r.id);
    this._newClusterAdded.emit(r);
  }

  public getClusterList() {
    return this._clusters.map(item => this.model.getCluster(item));
  }

  public canAdmit(cluster: RunCluster) {
    let date = cluster.date;
    return Run.sameDay(this.date, date);
  }

  public label() {
    return Run.formatDate(this.date);
  }
}

export namespace Run {
  export function formatTime(date: Date): string {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + ampm;
  }

  export function formatDate(date: Date): string {
    var monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    var dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];

    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    var dateDesc = "";

    if (sameDay(today, date)) dateDesc = "today ";
    else if (sameDay(yesterday, date)) dateDesc = "yesterday ";
    else dateDesc = dayNames[date.getDay()] + " ";

    dateDesc +=
      monthNames[date.getMonth()] +
      " " +
      date.getDate() +
      " " +
      date.getFullYear();
    return dateDesc;
  }

  export function sameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  export function beforeDay(d1: Date, d2: Date) {
    return (
      !this.sameDay(d1, d2) &&
      d1.getFullYear() <= d2.getFullYear() &&
      d1.getMonth() <= d2.getMonth() &&
      d1.getDate() <= d2.getDate()
    );
  }

  export function sameMinute(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate() &&
      d1.getHours() === d2.getHours() &&
      d1.getMinutes() === d2.getMinutes()
    );
  }

  export function dateNow(): Date {
    var d = new Date();
    d.setHours(12, 0, 0); // set to default time since we only want the day
    return d;
  }
}
