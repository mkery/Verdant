import { Widget } from "@phosphor/widgets";

import { Run, ChangeType } from "../model/run";

import { Nodey, NodeyCode, NodeyOutput, NodeyMarkdown } from "../model/nodey";

import { HistoryModel } from "../model/history";

import { VerdantPanel } from "./verdant-panel";

/*
 * History search bar
 */

const SEARCH_CONTAINER_CLASS = "v-VerdantPanel-search-container";
const SEARCH_BOX_CLASS = "v-VerdantPanel-search-box";
const SEARCH_INPUT_CLASS = "v-VerdantPanel-search-input";
const SEARCH_FILTER = "v-VerdantPanel-search-filter";
const SEARCH_CANCEL_BUTTON = "v-VerdantPanel-search-cancel";
const LEGEND_CONTAINER = "v-VerdantPanel-legend-container";
const LEGEND_LABEL = "v-VerdantPanel-legend-label";
const LEGEND_ITEM = "v-VerdantPanel-legend-item";

const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";

export class SearchBar extends Widget {
  private view: VerdantPanel;
  private textQuery: string = null;
  private focusNode: Nodey = null;
  readonly historyModel: HistoryModel;

  constructor(view: VerdantPanel, historyModel: HistoryModel) {
    super();
    this.view = view;
    this.historyModel = historyModel;
    this.addClass(SEARCH_CONTAINER_CLASS);

    let wrapper = document.createElement("div");
    let input = document.createElement("input");
    wrapper.className = SEARCH_BOX_CLASS;
    input.className = SEARCH_INPUT_CLASS;
    input.placeholder = "Filter by text";
    input.spellcheck = false;
    input.addEventListener("keyup", (ev: KeyboardEvent) => {
      if (ev.key === "13" || ev.which === 13) this.searchQueryEntered();
    });
    wrapper.appendChild(input);
    let xButton = document.createElement("div");
    xButton.classList.add(SEARCH_CANCEL_BUTTON);
    wrapper.appendChild(xButton);
    xButton.addEventListener("click", this.clearSearch.bind(this));
    this.node.appendChild(wrapper);

    let legend = document.createElement("div");
    legend.classList.add(SEARCH_FILTER);
    legend.classList.add("legend");
    let l = document.createElement("span");
    l.textContent = "Filter by kind";
    legend.appendChild(l);
    legend.addEventListener("click", this.toggleLegend.bind(this));

    let legendContainer = this.buildLegend();
    this.node.appendChild(legendContainer);
    legendContainer.style.display = "none";

    let starFilter = document.createElement("div");
    starFilter.classList.add(SEARCH_FILTER);
    starFilter.classList.add("star");
    starFilter.addEventListener("click", this.filter.bind(this, starFilter));

    let commentFilter = document.createElement("div");
    commentFilter.classList.add(SEARCH_FILTER);
    commentFilter.classList.add("comment");
    commentFilter.addEventListener(
      "click",
      this.filter.bind(this, commentFilter)
    );

    this.node.appendChild(legend);
    this.node.appendChild(starFilter);
    this.node.appendChild(commentFilter);
  }

  get legendButton() {
    return this.node.getElementsByClassName("legend")[0] as HTMLElement;
  }

  get addedButton() {
    return this.node.getElementsByClassName("added")[0] as HTMLElement;
  }

  get removedButton() {
    return this.node.getElementsByClassName("deleted")[0] as HTMLElement;
  }

  get changedButton() {
    return this.node.getElementsByClassName("changed")[0] as HTMLElement;
  }

  get starButton() {
    return this.node.getElementsByClassName("star")[0] as HTMLElement;
  }

  get commentButton() {
    return this.node.getElementsByClassName("comment")[0] as HTMLElement;
  }

  get outputButton() {
    return this.node.getElementsByClassName("output")[0] as HTMLElement;
  }

  get outputTextButton() {
    return this.node.getElementsByClassName("textOut")[0] as HTMLElement;
  }

  get outputTableButton() {
    return this.node.getElementsByClassName("tableOut")[0] as HTMLElement;
  }

  get outputImageButton() {
    return this.node.getElementsByClassName("imageOut")[0] as HTMLElement;
  }

  get markdownButton() {
    return this.node.getElementsByClassName("markdown")[0] as HTMLElement;
  }

  get codeButton() {
    return this.node.getElementsByClassName("code")[0] as HTMLElement;
  }

  get legendContainer() {
    return this.node.getElementsByClassName(LEGEND_CONTAINER)[0] as HTMLElement;
  }

  get searchBar() {
    return this.node.getElementsByClassName(
      SEARCH_INPUT_CLASS
    )[0] as HTMLInputElement;
  }

  runContainsNode(nodey: Nodey) {
    this.focusNode = nodey;
    this._runFilters();
  }

  toggleLegend() {
    let legend = this.legendContainer;
    if (legend.style.display === "none") {
      legend.style.display = "";
      this.node.style.marginBottom =
        legend.getBoundingClientRect().height + "px";
      this.legendButton.classList.add("open");
    } else {
      legend.style.display = "none";
      this.node.style.marginBottom = "";
      this.legendButton.classList.remove("open");
    }
  }

  buildLegendButton(label: string, labelClass: string, symbolClass: string) {
    let button = this.buildButton(label, labelClass);
    let cellAdd = document.createElement("div");
    cellAdd.classList.add(RUN_CELL_MAP_CELL);
    cellAdd.classList.add(symbolClass);
    cellAdd.classList.add("run");
    button.insertBefore(cellAdd, button.firstElementChild);
    return button;
  }

  buildButton(label: string, labelClass: string) {
    let button = document.createElement("div");
    button.classList.add(LEGEND_ITEM);
    let addLabel = document.createElement("div");
    addLabel.classList.add(LEGEND_LABEL);
    addLabel.textContent = label;
    button.appendChild(addLabel);
    button.classList.add(labelClass);
    button.addEventListener("click", () => this.filter(button));
    return button;
  }

  buildLegend(): HTMLElement {
    let container = document.createElement("div");
    container.classList.add(LEGEND_CONTAINER);

    let add = this.buildLegendButton(
      "cell created",
      "added",
      RUN_CELL_MAP_ADDED
    );
    container.appendChild(add);

    let remove = this.buildLegendButton(
      "cell deleted",
      "deleted",
      RUN_CELL_MAP_REMOVED
    );
    container.appendChild(remove);

    let edited = this.buildLegendButton(
      "cell edited",
      "changed",
      RUN_CELL_MAP_CHANGED
    );
    container.appendChild(edited);

    let markdown = this.buildButton("markdown", "markdown");
    container.appendChild(markdown);

    let codeCell = this.buildButton("code", "code");
    container.appendChild(codeCell);

    let output = this.buildButton("all output", "output");
    container.appendChild(output);

    let textOut = this.buildButton("text output", "textOut");
    container.appendChild(textOut);

    let tableOut = this.buildButton("table output", "tableOut");
    container.appendChild(tableOut);

    let imageOut = this.buildButton("image output", "imageOut");
    container.appendChild(imageOut);

    return container;
  }

  searchQueryEntered() {
    let searchBar = this.searchBar;
    let query = searchBar.value;
    this.textQuery = query;
    console.log("Query is", query);
    if (this.view.runList.isVisible) this._runFilters();
    else this._verFilters();
  }

  clearSearch() {
    let searchBar = this.searchBar;
    searchBar.value = "";
    this.textQuery = null;
    if (this.view.runList.isVisible) this._runFilters();
    else this._verFilters();
  }

  clearFilters() {
    this.focusNode = null;
    let searchBar = this.searchBar;
    searchBar.value = "";
    this.textQuery = null;
    let filters = this.node.getElementsByClassName(SEARCH_FILTER);
    for (let i = 0; i < filters.length; i++) {
      filters[i].classList.remove("highlight");
    }
    let legendButtons = this.node.getElementsByClassName(LEGEND_ITEM);
    for (let i = 0; i < legendButtons.length; i++) {
      legendButtons[i].classList.remove("highlight");
    }
  }

  enableRunButtons() {
    this.addedButton.style.display = "";
    this.removedButton.style.display = "";
    this.changedButton.style.display = "";
    this.markdownButton.style.display = "";
    this.codeButton.style.display = "";
    if (this.legendButton.classList.contains("open")) {
      this.node.style.marginBottom =
        this.legendContainer.getBoundingClientRect().height + "px";
    }
    this.searchBar.value = "";
    this.textQuery = null;
    let filters = this.node.getElementsByClassName(SEARCH_FILTER);
    for (let i = 0; i < filters.length; i++) {
      filters[i].classList.remove("highlight");
    }
  }

  enableNodeButtons() {
    this.addedButton.style.display = "none";
    this.removedButton.style.display = "none";
    this.changedButton.style.display = "none";
    this.markdownButton.style.display = "none";
    this.codeButton.style.display = "none";
    if (this.legendButton.classList.contains("open")) {
      this.node.style.marginBottom =
        this.legendContainer.getBoundingClientRect().height + "px";
    }
    this.searchBar.value = "";
    this.textQuery = null;
    let filters = this.node.getElementsByClassName(SEARCH_FILTER);
    for (let i = 0; i < filters.length; i++) {
      filters[i].classList.remove("highlight");
    }
  }

  filter(button: HTMLElement) {
    if (button.classList.contains("disable")) return; // ignore it

    if (button.classList.contains("highlight"))
      button.classList.remove("highlight");
    else button.classList.add("highlight");

    if (this.view.runList.isVisible) this._runFilters();
    else this._verFilters();
  }

  private _filterRunByNodey(): FilterFunction<Run> {
    if (this.focusNode instanceof NodeyOutput)
      return {
        filter: (r: Run) => {
          return r.newOutput.indexOf(this.focusNode.name) > -1;
        },
        label: "output " + this.focusNode.name
      };
    else
      return {
        filter: (r: Run) => {
          return r.notebook.indexOf(this.focusNode.name) > -1;
        },
        label: "node " + this.focusNode.name
      };
  }

  private _filterRunByAdded(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        return r.runCell.changeType === ChangeType.ADDED;
      },
      label: "cells added"
    };
  }

  private _filterRunByRemoved(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        return r.runCell.changeType === ChangeType.REMOVED;
      },
      label: "cells removed"
    };
  }

  private _filterRunByOutput(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        console.log("filter", r);
        return r.newOutput && r.newOutput.length > 0;
      },
      label: "cells that generated output"
    };
  }

  private _filterNodeyByOutput(): FilterFunction<Nodey> {
    return {
      filter: (n: Nodey) => {
        let runs = n.run;
        return runs.some(r => {
          let out = this.historyModel.runModel.getRun(r).newOutput;
          return out && out.length > 0;
        });
      },
      label: "versions that generated output"
    };
  }

  private _filterRunByChanged(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        return r.runCell.changeType === ChangeType.CHANGED;
      },
      label: "cells changed"
    };
  }

  private _filterRunByComment(): FilterFunction<Run> {
    return {
      filter: (r: Run) => r.note > -1,
      label: "a comment"
    };
  }

  private _filterRunByStar(): FilterFunction<Run> {
    return {
      filter: (r: Run) => r.star > -1,
      label: "stars"
    };
  }

  private _filterRunByMarkdown(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        let name = r.runCell.node;
        let node = this.historyModel.getNodey(name);
        return node instanceof NodeyMarkdown;
      },
      label: "Markdown cells"
    };
  }

  private _filterRunByCode(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        let name = r.runCell.node;
        let node = this.historyModel.getNodey(name);
        return node instanceof NodeyCode;
      },
      label: "code cells"
    };
  }

  private _filterNodeyByStar(): FilterFunction<Nodey> {
    return {
      filter: (r: Nodey) => r.star > -1,
      label: "stars"
    };
  }

  private _filterNodeyByComment(): FilterFunction<Nodey> {
    return {
      filter: (r: Nodey) => r.note > -1,
      label: "a comment"
    };
  }

  private _runFilters(): void {
    let filterList: FilterFunction<any>[] = [];
    let legendFilters: FilterFunction<any>[] = [];

    if (this.addedButton && this.addedButton.classList.contains("highlight"))
      legendFilters.push(this._filterRunByAdded());
    if (
      this.removedButton &&
      this.removedButton.classList.contains("highlight")
    )
      legendFilters.push(this._filterRunByRemoved());
    if (
      this.changedButton &&
      this.changedButton.classList.contains("highlight")
    )
      legendFilters.push(this._filterRunByChanged());
    if (this.outputButton && this.outputButton.classList.contains("highlight"))
      legendFilters.push(this._filterRunByOutput());
    if (
      this.markdownButton &&
      this.markdownButton.classList.contains("highlight")
    )
      legendFilters.push(this._filterRunByMarkdown());
    if (this.codeButton && this.codeButton.classList.contains("highlight"))
      legendFilters.push(this._filterRunByCode());

    if (this.starButton.classList.contains("highlight"))
      filterList.push(this._filterRunByStar());
    if (this.commentButton.classList.contains("highlight"))
      filterList.push(this._filterRunByComment());
    if (this.focusNode) filterList.push(this._filterRunByNodey());

    this.view.runList.clearFilters();
    if (filterList.length < 1 && !this.textQuery && legendFilters.length < 1) {
      this.legendButton.classList.remove("highlight");
    } else {
      if (legendFilters.length > 0)
        this.legendButton.classList.add("highlight");
      else this.legendButton.classList.remove("highlight");

      let filter = (r: Run) => {
        return (
          filterList.every(f => f.filter(r)) &&
          legendFilters.every(f => f.filter(r))
        );
      };
      let label = "";
      filterList.forEach(f => (label += f.label + " and "));
      legendFilters.forEach(f => (label += f.label + " and "));
      label = label.substring(0, label.length - 5);

      if (filterList.length > 0 || legendFilters.length > 0)
        this.view.runList.filterRunList({ filter, label });

      if (this.textQuery) this.view.runList.filterByText(this.textQuery);
    }
  }

  private _verFilters(): void {
    let filterList: FilterFunction<Nodey>[] = [];
    let legendFilters: FilterFunction<Nodey>[] = [];

    if (this.starButton.classList.contains("highlight"))
      filterList.push(this._filterNodeyByStar());
    if (this.commentButton.classList.contains("highlight"))
      filterList.push(this._filterNodeyByComment());

    if (this.outputButton && this.outputButton.classList.contains("highlight"))
      legendFilters.push(this._filterNodeyByOutput());

    this.view.cellPanel.clearFilters();
    if (filterList.length < 1 && !this.textQuery && legendFilters.length < 1) {
      this.legendButton.classList.remove("highlight");
    } else {
      if (legendFilters.length > 0)
        this.legendButton.classList.add("highlight");
      else this.legendButton.classList.remove("highlight");

      let filter = (r: Nodey) => {
        return (
          filterList.every(f => f.filter(r)) &&
          legendFilters.every(f => f.filter(r))
        );
      };
      let label = "";
      filterList.forEach(f => (label += f.label + " and "));
      legendFilters.forEach(f => (label += f.label + " and "));
      label = label.substring(0, label.length - 5);

      if (filterList.length > 0 || legendFilters.length > 0)
        this.view.cellPanel.filterNodeyList({ filter, label });

      if (this.textQuery) this.view.cellPanel.filterByText(this.textQuery);
    }
  }
}

export interface FilterFunction<i> {
  filter: (r: i) => boolean;
  label: string;
}
