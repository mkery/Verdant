import { Cell, CodeCell } from "@jupyterlab/cells";

import { OutputArea } from "@jupyterlab/outputarea";

import { VerCell } from "../components/cell";

export abstract class CellListen {
  cell: Cell;
  private readonly verCell: VerCell;

  constructor(cell: Cell, verCell: VerCell) {
    this.cell = cell;
    this.verCell = verCell;
  }

  /**
   * Dispose of the resources held by the model.
   */
  public dispose(): void {
    this.cell = null;
  }

  public focus(): void {}

  public blur(): void {}

  public async cellRun() {
    this.verCell.run();
  }
}

/*
*
*  Cell listen for code cells
*
*/
export class CodeCellListen extends CellListen {
  public get outputArea(): OutputArea {
    return (this.cell as CodeCell).outputArea;
  }
}

/*
  *
  *  Cell listen for code cells
  *
  */
export class MarkdownCellListen extends CellListen {}
