import { Nodey } from "./nodey";
/*
 * Notebook holds a list of cells
 */
export class NodeyNotebook extends Nodey {
  cells: string[] = [];

  constructor(options: NodeyNotebook.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyNotebook.Options) {
    super.updateState(options);
    if (options.cells && options.cells.length > 0)
      this.cells = options.cells.slice(0);
  }

  public toJSON(): NodeyNotebook.SERIALIZE {
    return { ...super.toJSON(), cells: this.cells };
  }

  get typeChar() {
    return "n";
  }
}

export namespace NodeyNotebook {
  export type Options = {
    cells: string[];
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    start_checkpoint?: number;
    cells: string[];
  }

  export function fromJSON(dat: NodeyNotebook.SERIALIZE): NodeyNotebook {
    return new NodeyNotebook({
      created: dat.start_checkpoint,
      cells: dat.cells,
    });
  }
}
