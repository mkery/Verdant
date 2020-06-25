import { Nodey } from "../nodey";
import { Checkpoint } from "../checkpoint";

export namespace SERIALIZE {
  export interface NodeHistory {
    runs: Checkpoint[];
    cells: number[];
    nodey: { nodey: number; versions: Nodey[] }[];
    output: { output: number; versions: Nodey[] }[];
    deletedCells: number[];
  }
}
