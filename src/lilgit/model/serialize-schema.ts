import { Pos } from "./nodey";
import { CheckpointType, CellRunData } from "./checkpoint";

export namespace SERIALIZE {
  export interface Nodey {
    parent?: string;
    start_checkpoint: number;
  }

  export interface NodeyNotebook extends Nodey {
    start_checkpoint: number;
    cells: string[];
  }

  export interface NodeyOutput extends Nodey {
    raw: { [key: string]: any };
  }

  export interface NodeyCode extends Nodey {
    type?: string;
    output: string;
    content?: any[];
    literal: string;
    start?: Pos;
    end?: Pos;
  }

  export interface NodeyMarkdown extends Nodey {
    markdown: string;
  }

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
