import { Widget } from "@phosphor/widgets";
import { CellSampler } from "./details/cell-sampler";
import { History } from "../model/history";
import { VerNotebook } from "../components/notebook";
import { VerCell } from "../components/cell";

const SUMMARY = "v-VerdantPanel-Summary";
const COL = "v-VerdantPanel-Summary-column";
const CELL = "v-VerdantPanel-Summary-cell";

export class Summary extends Widget {
  readonly history: History;
  readonly artifactCol: HTMLElement;
  readonly verCol: HTMLElement;

  constructor(history: History) {
    super();
    this.history = history;
    this.node.classList.add(SUMMARY);

    this.artifactCol = document.createElement("div");
    this.artifactCol.classList.add(COL);
    this.artifactCol.classList.add("artifactCol");
    this.node.appendChild(this.artifactCol);

    this.verCol = document.createElement("div");
    this.verCol.classList.add(COL);
    this.node.appendChild(this.verCol);

    this.history.ready.then(async () => {
      await this.history.notebook.ready;
      this.build(this.history);
    });
  }

  build(history: History) {
    let notebook = history.notebook;
    let title = notebook.name;
    let vers = history.store.getHistoryOf(notebook.model.name);
    let [cellA, cellV] = this.buildCell(title, vers.length);
    this.artifactCol.appendChild(cellA);
    this.verCol.appendChild(cellV);

    notebook.cells.forEach(cell => {
      let model = cell.model;
      let sample = CellSampler.sampleCell(history, model);
      vers = history.store.getHistoryOf(model.name);
      [cellA, cellV] = this.buildCell(sample, vers.length);
      this.artifactCol.appendChild(cellA);
      this.verCol.appendChild(cellV);
    });
  }

  updateNotebook(notebook: VerNotebook) {
    let title = notebook.name;
    let vers = this.history.store.getHistoryOf(notebook.model.name);
    let [cellA, cellV] = this.buildCell(title, vers.length);
    this.replaceCell(cellA, cellV, 0);
  }

  updateCell(cell: VerCell, index: number) {
    let model = cell.model;
    let sample = CellSampler.sampleCell(this.history, model);
    let vers = this.history.store.getHistoryOf(model.name);
    let [cellA, cellV] = this.buildCell(sample, vers.length);
    this.replaceCell(cellA, cellV, index);
  }

  highlightCell(index: number) {
    index++; //skip the notebook
    let children = this.artifactCol.children;
    for (var i = 0; i < children.length; i++) {
      if (i === index) children[i].classList.add("highlight");
      else children[i].classList.remove("highlight");
    }
  }

  buildCell(title: string | HTMLElement, vers: number) {
    let cellA = document.createElement("div");
    cellA.classList.add(CELL);

    if (title instanceof HTMLElement) cellA.appendChild(title);
    else cellA.textContent = title;

    let cellV = document.createElement("div");
    cellV.classList.add(CELL);
    cellV.classList.add("ver");

    cellV.textContent = vers + "";

    return [cellA, cellV];
  }

  replaceCell(cellA: HTMLElement, cellV: HTMLElement, index: number) {
    let childA = this.artifactCol.children[index];
    this.artifactCol.replaceChild(cellA, childA);
    let childV = this.verCol.children[index];
    this.verCol.replaceChild(cellV, childV);
  }
}
