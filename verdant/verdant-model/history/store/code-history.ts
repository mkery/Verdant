import { NodeHistory } from "./node-history";
import { NodeyCode, NodeyOutput } from "../../nodey";
import { Nodey } from "../../nodey";

/*
 * Goal is to keep track of all of the output that go with this code,
 * since different code versions will have different output history.
 */
export class CodeHistory extends NodeHistory<NodeyCode> {
  // these are entire output histories
  private output_histories: { [ver: number]: string } = {};

  addOutput(code_ver: number, out: NodeyOutput) {
    if (this.output_histories[code_ver])
      throw new Error(
        "code version already has an output history associated with it"
      );

    this.output_histories[code_ver] = out.typeChar + "." + out.id;
  }

  getOutput(code_ver: number) {
    return this.output_histories[code_ver];
  }

  get allOutput() {
    return Array.from(Object.values(this.output_histories));
  }

  fromJSON(
    jsn: CodeHistory.SERIALIZE,
    factory: (dat: Nodey.SERIALIZE) => NodeyCode,
    id?: number
  ) {
    super.fromJSON(jsn, factory, id);
    this.output_histories = jsn.output_histories;
  }

  // helper method
  protected serialize(vers: NodeyCode[]): CodeHistory.SERIALIZE {
    let data = super.serialize(vers);
    return { output_histories: this.output_histories, ...data };
  }
}

export namespace CodeHistory {
  export type SERIALIZE = {
    output_histories: { [ver: number]: string };
  } & NodeHistory.SERIALIZE;
}
