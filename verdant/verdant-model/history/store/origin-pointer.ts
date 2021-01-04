import { Nodey } from "../../nodey";

/*
 * an Origin Pointer
 */
export class OriginPointer {
  public readonly origin: string;
  constructor(originNode: Nodey | string) {
    if (originNode instanceof Nodey) this.origin = originNode.name;
    else this.origin = originNode;
  }
}
