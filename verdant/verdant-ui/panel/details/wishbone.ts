import { History } from "../../../verdant-model/history";
import { Nodey, NodeyCodeCell } from "../../../verdant-model/nodey";
import { Sampler } from "../../../verdant-model/sampler";
import { VerNotebook } from "../../../verdant-model/notebook";
import { CodeCell, Cell, MarkdownCell } from "@jupyterlab/cells";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerCell } from "../../../verdant-model/cell";

const WISHBONE_HIGHLIGHT = "v-VerdantPanel-wishbone-highlight";
const WISHBONE_HIGHLIGHT_CODE = "v-VerdantPanel-wishbone-code-highlight";
const WISHBONE_CODE = "v-VerdantPanel-wishbone-code";
const WISHBONE_CODE_MASK = "v-VerdantPanel-wishbone-code-mask";

export namespace Wishbone {
  export function startWishbone(history: History) {
    history.notebook.cells.forEach((verCell: VerCell) => {
      var cell = verCell.view;
      Private.addCellEvents(cell, verCell.model, history.inspector);

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

  export function selectTarget(nodey: Nodey, inspector: Sampler, _?: Event) {
    inspector.target.set(nodey);
  }

  export function selectCodeTarget(
    nodey: NodeyCodeCell,
    inspector: Sampler,
    cell: CodeCell,
    event: MouseEvent
  ) {
    event.stopPropagation();
    let area = cell.inputArea.editorWidget.node;
    let betterMatch = area.getElementsByClassName(WISHBONE_HIGHLIGHT_CODE)[0];
    if (!betterMatch) this.selectTarget(nodey, inspector, event);
    else
      inspector.target.set(
        inspector.target.figureOutTarget(
          nodey,
          cell,
          betterMatch as HTMLElement
        )
      );
  }

  function selectCode(lineMask: HTMLElement, ev: MouseEvent) {
    codeSelection(lineMask, ev);
  }

  export function addCellEvents(
    area: Cell | OutputArea,
    nodey: Nodey,
    inspector: Sampler
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
      let prompt = area.inputArea.node;
      prompt.appendChild(mask);
      addElemEvents(mask, nodey, inspector);

      // detect line events for code mask
      let lineMask = makeMask();
      let select = selectCode.bind(this, lineMask);
      area.editorWidget.node.appendChild(lineMask);
      lineMask.addEventListener("mouseup", (ev: MouseEvent) => {
        this.selectCodeTarget(nodey, inspector, area, ev);
      });
      lineMask.addEventListener("mouseenter", () => {
        document.addEventListener("mousemove", select);
      });
      lineMask.addEventListener("mouseleave", () => {
        lineMask.classList.remove("highlight");
        if (lineMask.parentElement) {
          let highlighted = lineMask.parentElement.getElementsByClassName(
            WISHBONE_HIGHLIGHT_CODE
          );
          for (var i = 0; i < highlighted.length; i++) {
            highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
          }
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

  function addElemEvents(mask: HTMLElement, nodey: Nodey, inspector: Sampler) {
    mask.addEventListener("mouseenter", () => {
      // signal known cell node of selection
      mask.classList.add("highlight");
    });
    mask.addEventListener("mouseleave", () => {
      // signal known cell node of selection
      mask.classList.remove(WISHBONE_HIGHLIGHT);
      mask.classList.remove("highlight");
    });
    mask.addEventListener("mouseup", (ev: MouseEvent) => {
      ev.stopPropagation();
      Private.selectTarget(nodey, inspector);
      return false;
    });
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
    if (outputNodey && verCell.outputArea)
      addCellEvents(verCell.outputArea, outputNodey, history.inspector);
  }

  function codeSelection(mask: Element, ev: MouseEvent) {
    if (mask.parentElement) {
      var highlighted = mask.parentElement.getElementsByClassName(
        WISHBONE_HIGHLIGHT_CODE
      );
      for (var i = 0; i < highlighted.length; i++) {
        highlighted[i].classList.remove(WISHBONE_HIGHLIGHT_CODE);
      }

      mask.classList.remove("highlight");

      var code = mask.parentElement.getElementsByClassName("CodeMirror-line");
      let betterMatch: Element;
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
