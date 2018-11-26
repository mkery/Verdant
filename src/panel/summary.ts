import { Widget } from "@phosphor/widgets";
import { CellSampler } from "./details/cell-sampler";
import { History } from "../model/history";
import { VerNotebook } from "../components/notebook";
import { VerCell } from "../components/cell";

const SUMMARY = "v-VerdantPanel-Summary";
const COL = "v-VerdantPanel-Summary-column";
const CELL = "v-VerdantPanel-Summary-cell";
const NOTEBOOK_ICON = "v-VerdantPanel-Summary-notebook-icon";
const NOTEBOOK_LABEL = "v-VerdantPanel-Summary-notebook-label";
const NOTEBOOK_TITLE = "v-VerdantPanel-Summary-notebook-title";
const HEADER = "v-VerdantPanel-Summary-header";
const HEADER_ALABEL = "v-VerdantPanel-Summary-header-aLabel";
const HEADER_VLABEL = "v-VerdantPanel-Summary-header-vLabel";

export class Summary extends Widget {
  readonly history: History;
  readonly artifactCol: HTMLElement;
  readonly verCol: HTMLElement;

  constructor(history: History) {
    super();
    this.history = history;

    let header = this.buildHeader();
    this.node.appendChild(header);

    let table = document.createElement("div");
    table.classList.add(SUMMARY);
    this.node.appendChild(table);

    this.artifactCol = document.createElement("div");
    this.artifactCol.classList.add(COL);
    this.artifactCol.classList.add("artifactCol");
    table.appendChild(this.artifactCol);

    this.verCol = document.createElement("div");
    this.verCol.classList.add(COL);
    table.appendChild(this.verCol);

    this.history.ready.then(async () => {
      await this.history.notebook.ready;
      this.build(this.history);
    });
  }

  buildHeader() {
    let header = document.createElement("div");
    header.classList.add(HEADER);

    let aLabel = document.createElement("div");
    aLabel.classList.add(HEADER_ALABEL);
    aLabel.textContent = "artifact";
    header.appendChild(aLabel);

    let vLabel = document.createElement("div");
    vLabel.classList.add(HEADER_VLABEL);
    vLabel.textContent = "versions";
    header.appendChild(vLabel);

    return header;
  }

  buildNotebookTitle(title: string) {
    let name = document.createElement("div");
    name.classList.add(NOTEBOOK_LABEL);
    let icon = document.createElement("div");
    icon.classList.add(NOTEBOOK_ICON);
    icon.classList.add("jp-NotebookIcon");
    let titleDiv = document.createElement("div");
    titleDiv.classList.add(NOTEBOOK_TITLE);
    titleDiv.textContent = title;
    name.appendChild(icon);
    name.appendChild(titleDiv);
    return name;
  }

  build(history: History) {
    let notebook = history.notebook;
    let title = notebook.name;
    let sample = this.buildNotebookTitle(title);
    let vers = history.store.getHistoryOf(notebook.model.name);
    let [cellA, cellV] = this.buildCell(sample, vers.length);
    this.artifactCol.appendChild(cellA);
    this.verCol.appendChild(cellV);

    notebook.cells.forEach(cell => {
      let model = cell.model;
      sample = CellSampler.sampleCell(history, model);
      vers = history.store.getHistoryOf(model.name);
      [cellA, cellV] = this.buildCell(sample, vers.length);
      this.artifactCol.appendChild(cellA);
      this.verCol.appendChild(cellV);
    });
  }

  updateNotebook(notebook: VerNotebook) {
    let title = notebook.name;
    let vers = this.history.store.getHistoryOf(notebook.model.name);
    let sample = this.buildNotebookTitle(title);
    let [cellA, cellV] = this.buildCell(sample, vers.length);
    this.replaceCell(cellA, cellV, 0);
  }

  updateCell(cell: VerCell, index: number) {
    index++; //skip the notebook
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

  addCell(cell: VerCell, index: number) {
    cell.ready.then(() => {
      index++; //skip the notebook
      let model = cell.model;
      let sample = CellSampler.sampleCell(this.history, model);
      let vers = this.history.store.getHistoryOf(model.name);
      let [cellA, cellV] = this.buildCell(sample, vers.length);
      this.artifactCol.insertBefore(cellA, this.artifactCol.children[index]);
      this.verCol.insertBefore(cellV, this.verCol.children[index + 1]);
    });
  }

  removeCell(index: number) {
    index++; //skip the notebook
    this.artifactCol.removeChild(this.artifactCol.children[index]);
    this.verCol.removeChild(this.verCol.children[index]);
  }

  buildCell(title: HTMLElement, vers: number) {
    let cellA = document.createElement("div");
    cellA.classList.add(CELL);

    cellA.appendChild(title);

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
