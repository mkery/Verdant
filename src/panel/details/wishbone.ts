import { History } from "../../model/history";
import { Nodey, NodeyCodeCell } from "../../model/nodey";
import { Inspect } from "../../inspect";
import { VerNotebook } from "../../components/notebook";
import { CodeCell, Cell, MarkdownCell } from "@jupyterlab/cells";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerCell } from "../../components/cell";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";
const WISHBONE_HIGHLIGHT_CODE = "v-VerdantPanel-wishbone-code-highlight";
const WISHBONE_CODE = "v-VerdantPanel-wishbone-code";
const WISHBONE_CODE_MASK = "v-VerdantPanel-wishbone-code-mask";

export namespace Wishbone {
  export function startWishbone(history: History) {
    history.notebook.cells.forEach((verCell: VerCell) => {
      var cell = verCell.view;
      Private.addCellEvents(cell, [verCell.lastSavedModel], history.inspector);

      if (cell instanceof CodeCell) {
        Private.addLineEvents(cell as CodeCell);
        Private.addOutputEvents(verCell, history);
      }
    });
  }

  export function endWishbone(notebook: VerNotebook) {
    notebook.cells.forEach((verCell: VerCell) => {
      var cell = verCell.view;
      Private.removeCellEvents(cell);
    });
  }
}

/*
* a place for Wishbone's internal functionality
*/
namespace Private {
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

  export function selectTarget(nodey: Nodey[], inspector: Inspect, _: Event) {
    inspector.changeTarget(nodey);
  }

  export function selectCodeTarget(
    nodey: NodeyCodeCell,
    inspector: Inspect,
    cell: CodeCell,
    event: MouseEvent
  ) {
    event.stopPropagation();
    let area = cell.inputArea.editorWidget.node;
    var code = area.getElementsByClassName("CodeMirror-line");
    let betterMatch: Element = null;
    for (var i = 0; i < code.length; i++) {
      if (highlightCode(event, code[i])) {
        betterMatch = code[i];
        break;
      }
    }

    if (!betterMatch) this.selectTarget([nodey], inspector, event);
    else
      inspector.changeTarget([
        inspector.figureOutTarget(nodey, cell, betterMatch as HTMLElement)
      ]);
  }

  function selectCode(lineMask: HTMLElement, ev: MouseEvent) {
    codeSelection(lineMask, ev);
  }

  export function addCellEvents(
    area: Cell | OutputArea,
    nodey: Nodey[],
    inspector: Inspect
  ) {
    // first create a mask
    let mask = makeMask();

    if (area instanceof MarkdownCell) {
      let inputArea = area.inputArea.node;
      inputArea.appendChild(mask);
      addElemEvents(mask, nodey, inspector);
    }
    if (area instanceof CodeCell) {
      // mask on prompt area
      let prompt = area.inputArea.promptNode;
      prompt.appendChild(mask);
      addElemEvents(mask, nodey, inspector);

      // detect line events for code mask
      let lineMask = makeMask();
      let select = selectCode.bind(this, lineMask);
      area.editorWidget.node.appendChild(lineMask);
      lineMask.addEventListener("click", (ev: MouseEvent) => {
        this.selectCodeTarget(nodey[0], inspector, area, ev);
      });
      lineMask.addEventListener("mouseenter", () => {
        document.addEventListener("mousemove", select);
      });
      lineMask.addEventListener("mouseleave", () => {
        lineMask.classList.remove("highlight");
        let highlighted = lineMask.parentElement.getElementsByClassName(
          WISHBONE_HIGHLIGHT_CODE
        );
        for (var i = 0; i < highlighted.length; i++) {
          highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
        }
        document.removeEventListener("mousemove", select);
      });
    }
    if (area instanceof OutputArea) {
      area.node.appendChild(mask);
      addElemEvents(mask, nodey, inspector);
    }
  }

  function makeMask() {
    var mask = document.createElement("div");
    mask.classList.add(WISHBONE_CODE_MASK);
    return mask;
  }

  function addElemEvents(
    mask: HTMLElement,
    nodey: Nodey[],
    inspector: Inspect
  ) {
    mask.addEventListener("mouseenter", () => {
      // signal known cell node of selection
      mask.classList.add("highlight");
    });
    mask.addEventListener("mouseleave", () => {
      // signal known cell node of selection
      mask.classList.remove(WISHBONE_HIGHLIGHT);
      mask.classList.remove("highlight");
    });
    mask.addEventListener(
      "mouseup",
      Private.selectTarget.bind(this, nodey, inspector)
    );
  }

  export function removeCellEvents(area: Cell) {
    let masks = area.node.getElementsByClassName(WISHBONE_CODE_MASK);
    for (let i = 0; i < masks.length; i++) masks[i].remove();

    if (area instanceof CodeCell) {
      let outputArea = area.outputArea.node;
      let masks = outputArea.getElementsByClassName(WISHBONE_CODE_MASK);
      for (let i = 0; i < masks.length; i++) masks[i].remove();

      masks = area.editorWidget.node.getElementsByClassName(WISHBONE_CODE_MASK);
      for (let i = 0; i < masks.length; i++) masks[i].remove();

      // get rid of any remaining highlights
      let highlighted = area.editorWidget.node.getElementsByClassName(
        WISHBONE_HIGHLIGHT_CODE
      );
      for (var i = 0; i < highlighted.length; i++) {
        highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
      }
      // remove event listeners
      highlighted = area.editorWidget.node.getElementsByClassName(
        WISHBONE_CODE
      );
      for (var i = 0; i < highlighted.length; i++) {
        highlighted[i].classList.remove(WISHBONE_CODE);
      }
    }
  }

  export function addOutputEvents(verCell: VerCell, history: History) {
    var outputNodey = verCell.output;
    if (outputNodey)
      addCellEvents(verCell.outputArea, [outputNodey], history.inspector);
  }

  function codeSelection(mask: Element, ev: MouseEvent) {
    var highlighted = mask.parentElement.getElementsByClassName(
      WISHBONE_HIGHLIGHT_CODE
    );
    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
    }
    mask.classList.remove("highlight");

    var code = mask.parentElement.getElementsByClassName("CodeMirror-line");
    let betterMatch = null;
    for (var i = 0; i < code.length; i++) {
      if (highlightCode(ev, code[i])) {
        betterMatch = code[i];
        break;
      }
    }

    if (!betterMatch) {
      mask.classList.add("highlight");
    }
  }

  function filterSelect(elem: Element, ev: MouseEvent) {
    var x = ev.clientX;
    var y = ev.clientY;
    var rects = elem.getBoundingClientRect();
    return (
      rects.left <= x && rects.right >= x && rects.top <= y && rects.bottom >= y
    );
  }

  export function addLineEvents(cell: CodeCell) {
    var code = cell.inputArea.node.getElementsByTagName("span");
    for (var i = 0; i < code.length; i++) {
      code[i].classList.add(WISHBONE_CODE);
    }
    var lines = cell.inputArea.node.getElementsByClassName("CodeMirror-line");
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.add(WISHBONE_CODE);
    }
  }
}
