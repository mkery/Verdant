import { Nodey } from "../../nodey";
import { OriginPointer } from "./origin-pointer";
import { Star } from "..";
import { log } from "../../notebook";

const DEBUG = false;

/*
 * Just a container for a list of nodey versions
 */
export class NodeHistory<T extends Nodey> {
  originPointer: OriginPointer = null;
  private unsavedEdits: Star<T> = null;
  protected versions: T[] = [];

  addVersion(nodey: T) {
    return this.versions.push(nodey);
  }

  getVersion(ver: number) {
    return this.versions[ver];
  }

  // wrap to allow override implementation of filter
  filter(callbackfn: (value: T, index: number, array: T[]) => unknown): T[] {
    return this.versions.filter(callbackfn);
  }

  // wrap to allow override implementation of map
  map(
    callbackfn: (value: Nodey, index: number, array: Nodey[]) => Promise<any>
  ): Promise<any>[] {
    return this.versions.map(callbackfn);
  }

  get name() {
    let latest = this.versions[this.versions.length - 1];
    if (latest) return latest.typeChar + "." + latest.id;
  }

  get latest() {
    if (this.unsavedEdits) return this.unsavedEdits;
    return this.versions[this.versions.length - 1];
  }

  get lastSaved(): Nodey {
    return this.versions[this.versions.length - 1];
  }

  get length() {
    return this.versions.length;
  }

  setLatestToStar(s: Star<T>): void {
    this.unsavedEdits = s;
  }

  discardStar() {
    this.unsavedEdits = null;
    return this.versions[this.versions.length - 1];
  }

  deStar() {
    let newNodey = this.unsavedEdits.value;
    this.unsavedEdits = null;
    this.versions.push(newNodey as T);
    newNodey.version = this.versions.length - 1;
    log("de-staring", newNodey, this);
    return newNodey;
  }

  addOriginPointer(origin: Nodey) {
    this.originPointer = new OriginPointer(origin);
  }

  toJSON(): NodeHistory.SERIALIZE {
    let data: Nodey.SERIALIZE[] = this.versions.map((node) => node.toJSON());
    if (this.originPointer)
      data[data.length - 1].origin = this.originPointer.origin;
    return { artifact_name: this.name, versions: data };
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
}

export namespace NodeHistory {
  export type SERIALIZE = {
    artifact_name: string;
    versions: Nodey.SERIALIZE[];
  };
}
