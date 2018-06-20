import { HistoryModel } from "../history-model";
import { Nodey, NodeyCodeCell } from "../nodey";
import { Inspect } from "../inspect";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { CellListen, CodeCellListen } from "../jupyter-hooks/cell-listen";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";
const WISHBONE_HIGHLIGHT_CODE = "v-VerdantPanel-wishbone-code-highlight";
const WISHBONE_CODE = "v-VerdantPanel-wishbone-code";
const WISHBONE_CODE_MASK = "v-VerdantPanel-wishbone-code-mask";

export namespace Wishbone {
  export function startWishbone(historyModel: HistoryModel) {
    historyModel.notebook.cells.forEach(
      (cellListen: CellListen, cell: Cell) => {
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
      }
    );
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
        Private.removeLineEvents(
          cell as CodeCell,
          cellListen as CodeCellListen,
          historyModel
        );
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

  export function highlightCode(event: MouseEvent, code: Element) {
    event.stopPropagation();
    if (filterSelect(code, event)) {
      var betterMatch = false;
      for (var i = 0; i < code.children.length; i++) {
        if (code.children[i].classList.contains(WISHBONE_CODE)) {
          betterMatch = highlightCode(event, code.children[i]);
          if (betterMatch) break;
        }
      }
      if (!betterMatch) {
        code.classList.add(WISHBONE_HIGHLIGHT_CODE);
      }
      return true;
    }
    return false;
  }

  export function selectTarget(
    nodey: Nodey[],
    inspector: Inspect,
    event: Event
  ) {
    inspector.changeTarget(nodey);
  }

  export function selectCodeTarget(
    nodey: NodeyCodeCell,
    inspector: Inspect,
    cell: CodeCell,
    event: MouseEvent
  ) {
    event.stopPropagation();
    if (filterSelect(event.target as Element, event))
      inspector.changeTarget([
        inspector.figureOutTarget(nodey, cell, event.target as HTMLElement)
      ]);
  }

  export function addEvents(elem: Element, nodey: Nodey[], inspector: Inspect) {
    elem.addEventListener("mouseenter", Private.highlightSelection, false);
    elem.addEventListener("mouseleave", Private.blurSelection);
    elem.addEventListener(
      "mousedown",
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
      "mousedown",
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
    var nodey = cellListen.nodey as NodeyCodeCell;
    var mask = document.createElement("div");
    mask.classList.add(WISHBONE_CODE_MASK);
    mask.addEventListener("click", filterEvents);
    mask.addEventListener("mouseenter", startCodeSelection.bind(this, mask));
    mask.addEventListener("mouseleave", endCodeSelection.bind(this, mask));
    cell.editorWidget.node.appendChild(mask);
    var code = cell.inputArea.node.getElementsByTagName("span");
    for (var i = 0; i < code.length; i++) {
      code[i].classList.add(WISHBONE_CODE);
      code[i].addEventListener(
        "click",
        Private.selectCodeTarget.bind(this, nodey, historyModel.inspector, cell)
      );
    }
    var lines = cell.inputArea.node.getElementsByClassName("CodeMirror-line");
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.add(WISHBONE_CODE);
      lines[i].addEventListener(
        "click",
        Private.selectCodeTarget.bind(this, nodey, historyModel.inspector, cell)
      );
    }
  }

  function startCodeSelection(mask: Element, ev: MouseEvent) {
    mask.addEventListener("mousemove", codeSelection.bind(this, mask));
  }

  function codeSelection(mask: Element, ev: MouseEvent) {
    var highlighted = document.getElementsByClassName(WISHBONE_HIGHLIGHT_CODE);
    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
    }
    var code = mask.parentElement.getElementsByClassName("CodeMirror-line");
    for (var i = 0; i < code.length; i++) {
      highlightCode(ev, code[i]);
    }
  }

  function endCodeSelection(mask: Element, ev: MouseEvent) {
    mask.removeEventListener("mousemove", codeSelection.bind(this, mask));
  }

  function filterEvents(ev: MouseEvent) {
    var mask = this;
    console.log("mask " + ev.type, ev.target, ev);
    ev.preventDefault();
    ev.stopPropagation();

    var event = new MouseEvent(ev.type, ev);

    var code = mask.parentElement.getElementsByClassName(
      WISHBONE_HIGHLIGHT_CODE
    );
    for (var i = 0; i < code.length; i++) code[i].dispatchEvent(event);
  }

  function filterSelect(elem: Element, ev: MouseEvent) {
    var x = ev.clientX;
    var y = ev.clientY;
    var rects = elem.getBoundingClientRect();
    return (
      rects.left <= x && rects.right >= x && rects.top <= y && rects.bottom >= y
    );
  }

  export function removeLineEvents(
    cell: CodeCell,
    cellListen: CodeCellListen,
    historyModel: HistoryModel
  ) {
    var nodey = cellListen.nodey as NodeyCodeCell;
    var mask = cell.inputArea.node.getElementsByClassName(
      WISHBONE_CODE_MASK
    )[0];
    mask.remove();
    var code = cell.inputArea.node.getElementsByClassName(WISHBONE_CODE);
    for (var i = 0; i < code.length; i++) {
      code[i].removeEventListener(
        "click",
        Private.selectCodeTarget.bind(this, nodey, historyModel.inspector, cell)
      );
      code[i].classList.remove(WISHBONE_CODE);
    }
  }
}
