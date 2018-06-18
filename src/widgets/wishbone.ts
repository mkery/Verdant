import { HistoryModel } from "../history-model";
import { Nodey, NodeyCodeCell } from "../nodey";
import { Inspect } from "../inspect";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { CellListen, CodeCellListen } from "../jupyter-hooks/cell-listen";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";
const WISHBONE_LINE = "v-VerdantPanel-wishbone-line";
const WISHBONE_LINE_SEG = "v-VerdantPanel-wishbone-line-seg";

export namespace Wishbone {
  export function startWishbone(
    notebook: NotebookListen,
    historyModel: HistoryModel
  ) {
    notebook.cells.forEach((cellListen: CellListen, cell: Cell) => {
      Private.addEvents(
        cell.inputArea.promptNode,
        [cellListen.nodey],
        historyModel.inspector
      );

      if (cell instanceof CodeCell) {
        Private.addLineEvents(
          cell as CodeCell,
          cellListen as CodeCellListen,
          historyModel
        );
        Private.addOutputEvents(cellListen as CodeCellListen, historyModel);
      }
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

      if (cell instanceof CodeCell) {
        Private.removeLineEvents();
        Private.removeOutputEvents(cellListen as CodeCellListen, historyModel);
      }
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
    console.log("Clicked", event.target);
    inspector.changeTarget(nodey);
  }

  export function addEvents(elem: Element, nodey: Nodey[], inspector: Inspect) {
    elem.addEventListener("mouseenter", Private.highlightSelection, false);
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

  export function addLineEvents(
    cell: CodeCell,
    cellListen: CodeCellListen,
    historyModel: HistoryModel
  ) {
    var lines = cell.inputArea.node.getElementsByClassName("CodeMirror-line");
    var nodes = historyModel.inspector.getNodesByLine(
      cellListen.nodey as NodeyCodeCell
    );
    console.log("lines are", nodes);
    for (var i = 0; i < lines.length; i++) {
      var wishLine = document.createElement("div");
      wishLine.classList.add(WISHBONE_LINE);
      var lineNodes = nodes[i];
      lineNodes.forEach(nodey => {
        var seg = document.createElement("div");
        seg.classList.add(WISHBONE_LINE_SEG);
        if (nodey.end.line === nodey.start.line) {
          var filler = "";
          var length = nodey.end.ch - nodey.start.ch;
          for (var j = 0; j < length; j++) {
            filler += "w";
          }
          seg.textContent = filler;
        }
        wishLine.appendChild(seg);
        addEvents(seg, [nodey], historyModel.inspector);
      });
      lines[i].appendChild(wishLine);
      //addEvents(wishLine, nodes[i], historyModel.inspector);
    }
  }

  export function removeLineEvents() {
    var lines = document.getElementsByClassName(WISHBONE_LINE);
    while (lines[0]) {
      lines[0].parentNode.removeChild(lines[0]);
    }
  }
}
