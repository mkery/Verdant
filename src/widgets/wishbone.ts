import { HistoryModel } from "../history-model";
import { Nodey } from "../nodey";
import { Inspect } from "../inspect";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { CellListen, CodeCellListen } from "../jupyter-hooks/cell-listen";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";

export namespace Wishbone {
  export function startWishbone(
    notebook: NotebookListen,
    historyModel: HistoryModel
  ) {
    notebook.cells.forEach((cellListen: CellListen, cell: Cell) => {
      Private.addEvents(
        cell.inputArea.node,
        [cellListen.nodey],
        historyModel.inspector
      );

      if (cell instanceof CodeCell)
        Private.addOutputEvents(cellListen as CodeCellListen, historyModel);
    });
  }

  export function endWishbone(
    notebook: NotebookListen,
    historyModel: HistoryModel
  ) {
    notebook.cells.forEach((cellListen: CellListen, cell: Cell) => {
      Private.removeEvents(
        cell.inputArea.node,
        [cellListen.nodey],
        historyModel.inspector
      );

      if (cell instanceof CodeCell)
        Private.removeOutputEvents(cellListen as CodeCellListen, historyModel);
    });
  }
}

/*
* a place for Wishbone's internal functionality
*/
namespace Private {
  export function highlightSelection(event: Event) {
    (<Element>event.target).classList.add(WISHBONE_HIGHLIGHT);
  }

  export function blurSelection(event: Event) {
    (<Element>event.target).classList.remove(WISHBONE_HIGHLIGHT);
  }

  export function selectTarget(
    nodey: Nodey[],
    inspector: Inspect,
    event: Event
  ) {
    inspector.changeTarget(nodey);
  }

  export function addEvents(
    elem: HTMLElement,
    nodey: Nodey[],
    inspector: Inspect
  ) {
    elem.addEventListener("mouseenter", Private.highlightSelection);
    elem.addEventListener("mouseleave", Private.blurSelection);
    elem.addEventListener(
      "click",
      Private.selectTarget.bind(this, nodey, inspector)
    );
  }

  export function removeEvents(
    elem: HTMLElement,
    nodey: Nodey[],
    inspector: Inspect
  ) {
    elem.removeEventListener("mouseenter", Private.highlightSelection);
    elem.removeEventListener("mouseleave", Private.blurSelection);
    elem.removeEventListener(
      "click",
      Private.selectTarget.bind(this, nodey, inspector)
    );
  }

  export function addOutputEvents(
    cellListen: CodeCellListen,
    historyModel: HistoryModel
  ) {
    var outputNodey = cellListen.output;
    if (outputNodey)
      addEvents(
        cellListen.outputArea.node,
        outputNodey,
        historyModel.inspector
      );
  }

  export function removeOutputEvents(
    cellListen: CodeCellListen,
    historyModel: HistoryModel
  ) {
    var outputNodey = cellListen.output;
    if (outputNodey)
      removeEvents(
        cellListen.outputArea.node,
        outputNodey,
        historyModel.inspector
      );
  }
}
