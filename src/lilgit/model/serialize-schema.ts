import { Nodey } from "./nodey";
import { CheckpointType, CellRunData } from "./checkpoint";

export namespace SERIALIZE {
  export interface Checkpoint {
    checkpointType: CheckpointType;
    timestamp: number;
    notebook: number;
    targetCells: CellRunData[];
  }

  export interface NodeHistory {
    runs: Checkpoint[];
    cells: number[];
    nodey: { nodey: number; versions: Nodey[] }[];
    output: { output: number; versions: Nodey[] }[];
    deletedCells: number[];
  }
}
