import { HistoryModel } from "../history-model";
import { Nodey, NodeyCode, NodeyCodeCell, SyntaxToken } from "../nodey";
import { Inspect } from "../inspect";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { CellListen, CodeCellListen } from "../jupyter-hooks/cell-listen";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";
const WISHBONE_LINE = "v-VerdantPanel-wishbone-line";
const WISHBONE_NODEY = "v-VerdantPanel-wishbone-line-seg";
const WISHBONE_SPACING = "v-VerdantPanel-wishbone-spacing";
const WISHBONE_FULLLINE = "v-VerdantPanel-wishbone-line-full";

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
    var wishElem = document.createElement("div");
    wishElem.classList.add(WISHBONE_LINE);

    var nodey = cellListen.nodey as NodeyCodeCell;
    nodesToSpans(nodey, wishElem, wishElem, historyModel);
    cell.inputArea.node
      .getElementsByClassName("CodeMirror-lines")[0]
      .appendChild(wishElem);
  }

  function nodesToSpans(
    nodey: NodeyCode,
    elem: Element,
    container: Element,
    historyModel: HistoryModel,
    level: number = 0
  ): void {
    var childBreak = container;
    if (nodey.start.line !== nodey.end.line) {
      // has multiple lines
      elem.classList.add(WISHBONE_FULLLINE);
      childBreak = elem;
    }

    var spacing = ""; // add in spaceing
    if (nodey.literal) {
      var span = document.createElement("span");
      span.textContent = nodey.literal;
      elem.appendChild(span);
    }
    if (nodey.content) {
      var priorLiteral = false;
      nodey.content.forEach(name => {
        if (name instanceof SyntaxToken) {
          if (name.tokens === "\n") {
            var br = document.createElement("div");
            br.classList.add(WISHBONE_FULLLINE);
            container.appendChild(br);
            spacing = "";
          } else if (!priorLiteral && spacing != "") {
            spacing = name.tokens;
          } else {
            spacing += name.tokens;
          }
          priorLiteral = true;
        }
        if (spacing !== "") {
          var span = document.createElement("div");
          span.classList.add(WISHBONE_SPACING);
          span.textContent = spacing;
          elem.appendChild(span);
          spacing = "";
        }
        if (!(name instanceof SyntaxToken)) {
          spacing = "w"; // add in spaceing
          var childElem = document.createElement("div");
          childElem.classList.add(WISHBONE_NODEY);
          childElem.style.zIndex = level + 1 + "";
          var child = historyModel.getNodey(name);
          nodesToSpans(
            child as NodeyCode,
            childElem,
            childBreak,
            historyModel,
            level++
          );
          elem.appendChild(childElem);
          priorLiteral = false;
        }
      });
    }
  }

  export function removeLineEvents() {
    var lines = document.getElementsByClassName(WISHBONE_LINE);
    while (lines[0]) {
      lines[0].parentNode.removeChild(lines[0]);
    }
  }
}
