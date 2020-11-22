export abstract class Nodey {
  id: number | undefined; //id for this node
  version: number | undefined; //chronological number
  created: number | undefined; //id marking which checkpoint
  parent: string | undefined; //lookup id for the parent Nodey of this Nodey

  constructor(options: Nodey.Options) {
    this.id = options.id;
    if (options.created !== undefined) this.created = options.created;
    if (options.parent !== undefined) this.parent = options.parent + "";
  }

  get name(): string {
    return this.typeChar + "." + this.id + "." + this.version;
  }

  get artifactName(): string {
    return this.typeChar + "." + this.id;
  }

  public updateState(_: Nodey.Options) {}

  public toJSON(): Nodey.SERIALIZE {
    let jsn = {};
    if (this.created) jsn["start_checkpoint"] = this.created;
    if (this.parent) jsn["parent"] = this.parent;
    return jsn;
  }

  abstract get typeChar(): string;
}

export namespace Nodey {
  export type Options = {
    id?: number; //id for this node
    version?: any; //chronological number
    created?: number; //id marking which checkpoint
    parent?: string | number; //lookup id for the parent Nodey of this Nodey
  };

  export interface SERIALIZE {
    parent?: string;
    start_checkpoint?: number;
    origin?: string; // only used if this nodey was derived from a prior seperate nodey
  }
}

/*
 * Cell-level nodey interface
 */
export interface NodeyCell extends Nodey {}
