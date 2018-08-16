import { Widget } from "@phosphor/widgets";

import { Run, ChangeType } from "../model/run";

import { Nodey, NodeyMarkdown } from "../model/nodey";

import { HistoryModel } from "../model/history";

import { VerdantPanel } from "./verdant-panel";

import { Legend } from "./legend";

/*
 * History search bar
 */

const SEARCH_CONTAINER_CLASS = "v-VerdantPanel-search-container";
const SEARCH_BOX_CLASS = "v-VerdantPanel-search-box";
const SEARCH_INPUT_CLASS = "v-VerdantPanel-search-input";
const SEARCH_FILTER = "v-VerdantPanel-search-filter";
const SEARCH_CANCEL_BUTTON = "v-VerdantPanel-search-cancel";

export class SearchBar extends Widget {
  private view: VerdantPanel;
  private textQuery: string = null;
  private legend: Legend;
  readonly historyModel: HistoryModel;

  constructor(view: VerdantPanel, historyModel: HistoryModel) {
    super();
    this.view = view;
    this.historyModel = historyModel;
    this.legend = new Legend(this);
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
    this.node.appendChild(this.legend.node);
    this.legend.node.style.display = "none";

    let legend = document.createElement("div");
    legend.classList.add(SEARCH_FILTER);
    legend.classList.add("legend");
    let l = document.createElement("span");
    l.textContent = "Filter by kind";
    legend.appendChild(l);
    legend.addEventListener("click", this.toggleLegend.bind(this));

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
    return this.node.getElementsByClassName("legend")[0];
  }

  get addedButton() {
    return this.node.getElementsByClassName("added")[0];
  }

  get removedButton() {
    return this.node.getElementsByClassName("deleted")[0];
  }

  get changedButton() {
    return this.node.getElementsByClassName("changed")[0];
  }

  get starButton() {
    return this.node.getElementsByClassName("star")[0];
  }

  get commentButton() {
    return this.node.getElementsByClassName("comment")[0];
  }

  get outputButton() {
    return this.node.getElementsByClassName("output")[0];
  }

  get outputTextButton() {
    return this.node.getElementsByClassName("textOut")[0];
  }

  get outputTableButton() {
    return this.node.getElementsByClassName("tableOut")[0];
  }

  get outputImageButton() {
    return this.node.getElementsByClassName("imageOut")[0];
  }

  get markdownButton() {
    return this.node.getElementsByClassName("markdown")[0];
  }

  get searchBar() {
    return this.node.getElementsByClassName(
      SEARCH_INPUT_CLASS
    )[0] as HTMLInputElement;
  }

  toggleLegend() {
    let open = this.legend.toggleLegend();
    if (open) {
      this.node.style.marginBottom =
        this.legend.node.getBoundingClientRect().height + "px";
      this.legendButton.classList.add("open");
    } else {
      this.node.style.marginBottom = "";
      this.legendButton.classList.remove("open");
    }
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
    let filters = this.node.getElementsByClassName(SEARCH_FILTER);
    for (let i = 0; i < filters.length; i++) {
      filters[i].classList.remove("highlight");
    }
  }

  disableRunButtons() {
    this.addedButton.classList.add("disable");
    this.removedButton.classList.add("disable");
    this.changedButton.classList.add("disable");
  }

  enableRunButtons() {
    this.addedButton.classList.remove("disable");
    this.removedButton.classList.remove("disable");
    this.changedButton.classList.remove("disable");
  }

  filter(button: HTMLElement) {
    if (button.classList.contains("disable")) return; // ignore it

    if (button.classList.contains("highlight"))
      button.classList.remove("highlight");
    else button.classList.add("highlight");

    if (this.view.runList.isVisible) this._runFilters();
    else this._verFilters();
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

  private _filterRunByText(): FilterFunction<string> {
    let query = this.textQuery;
    /*let historyModel = this.historyModel*/
    //TODO with optimizations
    return {
      filter: (text: string) => {
        return text.indexOf(query) > -1;
      },
      label: 'the words "' + query + '"'
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

  private _filterNodeyByText(): FilterFunction<Nodey> {
    let query = this.textQuery;
    return {
      filter: (_: Nodey) => true, //TODO with optimizations
      label: "the words " + query
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

    if (this.starButton.classList.contains("highlight"))
      filterList.push(this._filterRunByStar());
    if (this.commentButton.classList.contains("highlight"))
      filterList.push(this._filterRunByComment());

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

      if (this.textQuery)
        this.view.runList.filterByText(this._filterRunByText());
    }
  }

  private _verFilters(): void {
    let filterList: FilterFunction<Nodey>[] = [];

    if (this.textQuery) filterList.push(this._filterNodeyByText());
    if (this.starButton.classList.contains("highlight"))
      filterList.push(this._filterNodeyByStar());
    if (this.commentButton.classList.contains("highlight"))
      filterList.push(this._filterNodeyByComment());

    if (filterList.length < 1) this.view.cellPanel.clearFilters();
    else {
      let filter = (r: Nodey) => filterList.every(f => f.filter(r));
      let label = "";
      filterList.forEach(f => (label += f.label + " and "));
      label = label.substring(0, label.length - 5);
      this.view.cellPanel.filterNodeyList({ filter, label });
    }
  }
}

export interface FilterFunction<i> {
  filter: (r: i) => boolean;
  label: string;
}
