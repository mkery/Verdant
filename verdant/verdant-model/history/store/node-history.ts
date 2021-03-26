import { Nodey } from "../../nodey";
import { OriginPointer } from "./origin-pointer";
import { log } from "../../notebook";

const DEBUG = false;

/*
 * Just a container for a list of nodey versions
 */
export class NodeHistory<T extends Nodey> {
  originPointer: OriginPointer | null = null;
  protected versions: T[] = [];

  getAllVersions(): T[] {
    return this.versions.slice(0);
  }

  addVersion(nodey: T): void {
    let ver = this.versions.push(nodey);
    nodey.version = ver - 1;
  }

  getVersion(ver: number): T | undefined {
    return ver > -1 ? this.versions[ver] : undefined;
  }

  find(
    callbackfn: (value: T, index: number, array: T[]) => boolean
  ): T | undefined {
    return this.versions.find(callbackfn);
  }

  foreach(callbackfn: (value: T, index: number, array: T[]) => void): void {
    return this.versions.forEach(callbackfn);
  }

  // wrap to allow override implementation of filter
  filter(callbackfn: (value: T, index: number, array: T[]) => unknown): T[] {
    return this.versions.filter(callbackfn);
  }

  // wrap to allow override implementation of map
  map(callbackfn: (value: T, index?: number, array?: T[]) => any): any[] {
    return this.versions.map(callbackfn);
  }

  get name() {
    let latest = this.versions[this.versions.length - 1];
    if (latest)
      return (
        latest.typeChar + "." + (latest.id !== undefined ? latest.id : "???")
      );
  }

  get latest(): T {
    return this.versions[this.versions.length - 1];
  }

  get length() {
    return this.versions.length;
  }

  addOriginPointer(origin: Nodey) {
    this.originPointer = new OriginPointer(origin);
  }

  toJSON(): NodeHistory.SERIALIZE {
    return this.serialize(this.versions);
  }

  fromJSON(
    jsn: NodeHistory.SERIALIZE,
    factory: (dat: Nodey.SERIALIZE) => T,
    id?: number
  ) {
    if (DEBUG) log("FACTORY DATA", jsn);
    this.versions = jsn.versions.map(
      (nodeDat: Nodey.SERIALIZE, version: number) => {
        if (nodeDat.origin)
          this.originPointer = new OriginPointer(nodeDat.origin);
        let nodey = factory(nodeDat);
        nodey.id = id;
        nodey.version = version;
        //log("MADE NODEY FROM DATA", nodey, nodeDat);
        return nodey;
      }
    );
  }

  sliceByTime(fromTime: number, toTime: number): NodeHistory.SERIALIZE {
    let slice: T[] = [];
    // get the first index of versions that happen on or after fromTime
    let i = this.versions.findIndex((nodey) => {
      return nodey.created >= fromTime && nodey.created < toTime;
    });
    let nodey: T = this.versions[i]; // check each nodey to see if it is within time
    while (nodey && nodey.created >= fromTime && nodey.created < toTime) {
      slice.push(nodey);
      i++;
      nodey = this.versions[i];
    }
    return this.serialize(slice);
  }

  sliceByVer(fromVer: number, toVer: number): NodeHistory.SERIALIZE {
    let slice = this.versions.slice(fromVer, toVer);
    return this.serialize(slice);
  }

  // helper method
  protected serialize(vers: T[]): NodeHistory.SERIALIZE {
    let data: Nodey.SERIALIZE[] = vers.map((node) => node.toJSON());
    if (this.originPointer && data.length > 0)
      data[data.length - 1].origin = this.originPointer.origin;
    return { artifact_name: this.name || "", versions: data };
  }
}

export namespace NodeHistory {
  export type SERIALIZE = {
    artifact_name: string;
    versions: Nodey.SERIALIZE[];
  };
}
