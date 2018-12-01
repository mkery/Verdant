import { History } from "../model/history";
import { Nodey, NodeyCodeCell } from "../model/nodey";
import { Inspect } from "../inspect";
import { VerNotebook } from "../components/notebook";
import { CodeCell, Cell, MarkdownCell } from "@jupyterlab/cells";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerCell } from "../components/cell";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";
const WISHBONE_HIGHLIGHT_CODE = "v-VerdantPanel-wishbone-code-highlight";
const WISHBONE_CODE = "v-VerdantPanel-wishbone-code";
const WISHBONE_CODE_MASK = "v-VerdantPanel-wishbone-code-mask";

export namespace Wishbone {
  export function startWishbone(history: History) {
    console.log("starting wishbone!", history);
    history.notebook.cells.forEach((verCell: VerCell) => {
      var cell = verCell.view;
      Private.addCellEvents(cell, [verCell.model], history.inspector);

      if (cell instanceof CodeCell) {
        Private.addLineEvents(cell as CodeCell, verCell, history);
        Private.addOutputEvents(verCell, history);
      }
    });
  }

  export function endWishbone(notebook: VerNotebook, history: History) {
    notebook.cells.forEach((verCell: VerCell) => {
      var cell = verCell.view;
      Private.removeCellEvents(cell);

      if (cell instanceof CodeCell) {
        Private.removeLineEvents(cell as CodeCell, verCell, history);
      }
    });
  }
}

/*
* a place for Wishbone's internal functionality
*/
namespace Private {
  export function highlightCode(event: MouseEvent, code: Element) {
    event.stopPropagation();
    console.log("HIGHLIGHT CODE");
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
    if (filterSelect(event.target as Element, event))
      inspector.changeTarget([
        inspector.figureOutTarget(nodey, cell, event.target as HTMLElement)
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
      // detect line events for code mask
      let lineMask = makeMask();
      let select = selectCode.bind(this, lineMask);
      area.editorWidget.node.appendChild(lineMask);
      lineMask.addEventListener("mouseenter", () => {
        document.addEventListener("mousemove", select);
      });
      lineMask.addEventListener("mouseleave", () => {
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
    }
  }

  export function addOutputEvents(verCell: VerCell, history: History) {
    var outputNodey = verCell.output;
    console.log("output nodey are", outputNodey);
    if (outputNodey)
      outputNodey.forEach(out =>
        addCellEvents(verCell.outputArea, [out], history.inspector)
      );
  }

  export function addLineEvents(
    cell: CodeCell,
    verCell: VerCell,
    history: History
  ) {
    var nodey = verCell.model as NodeyCodeCell;
    var code = cell.inputArea.node.getElementsByTagName("span");
    for (var i = 0; i < code.length; i++) {
      code[i].classList.add(WISHBONE_CODE);
      code[i].addEventListener(
        "click",
        Private.selectCodeTarget.bind(this, nodey, history.inspector, cell)
      );
    }
    var lines = cell.inputArea.node.getElementsByClassName("CodeMirror-line");
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.add(WISHBONE_CODE);
      lines[i].addEventListener(
        "click",
        Private.selectCodeTarget.bind(this, nodey, history.inspector, cell)
      );
    }
  }

  function codeSelection(mask: Element, ev: MouseEvent) {
    var highlighted = document.getElementsByClassName(WISHBONE_HIGHLIGHT_CODE);

    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
    }
    console.log("CODE SELECTION");
    var code = mask.parentElement.getElementsByClassName("CodeMirror-line");
    for (var i = 0; i < code.length; i++) {
      highlightCode(ev, code[i]);
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

  export function removeLineEvents(
    cell: CodeCell,
    verCell: VerCell,
    history: History
  ) {
    var nodey = verCell.model as NodeyCodeCell;

    // get rid of any remaining highlights
    var highlighted = document.getElementsByClassName(WISHBONE_HIGHLIGHT_CODE);
    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
    }
    // remove event listeners
    var code = cell.inputArea.node.getElementsByClassName(WISHBONE_CODE);
    for (var i = 0; i < code.length; i++) {
      code[i].removeEventListener(
        "click",
        Private.selectCodeTarget.bind(this, nodey, history.inspector, cell)
      );
      code[i].classList.remove(WISHBONE_CODE);
    }
  }
}
