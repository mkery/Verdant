import { Nodey, NodeyCode } from "../../nodey";

/*
 * little wrapper class for pending changes with a star
 */
export class Star<T extends Nodey> {
  readonly value: T;
  cellId: string = "?";

  constructor(nodey: T) {
    this.value = nodey;
  }

  get id(): number {
    return this.value.id;
  }

  set parent(name: string) {
    this.value.parent = name;
  }

  get version(): string {
    return "*";
  }

  get name(): string {
    return "*" + "." + this.value.typeChar + "." + this.value.id;
  }

  get typeChar(): string {
    return this.value.typeChar;
  }
}

export class UnsavedStar extends Star<NodeyCode> {
  get version(): string {
    return "TEMP";
  }

  get name(): string {
    return "TEMP" + "." + this.cellId + "." + this.value.id;
  }
}
