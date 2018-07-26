import { Widget } from "@phosphor/widgets";

import { Run, ChangeType } from "../model/run";

import { VerdantPanel } from "./verdant-panel";
/*
 * History search bar
 */

const SEARCH_CONTAINER_CLASS = "v-VerdantPanel-search-container";
const SEARCH_BOX_CLASS = "v-VerdantPanel-search-box";
const SEARCH_INPUT_CLASS = "v-VerdantPanel-search-input";
const SEARCH_FILTER = "v-VerdantPanel-search-filter";

export class SearchBar extends Widget {
  private view: VerdantPanel;

  constructor(view: VerdantPanel) {
    super();
    this.view = view;
    this.addClass(SEARCH_CONTAINER_CLASS);

    let wrapper = document.createElement("div");
    let input = document.createElement("input");
    wrapper.className = SEARCH_BOX_CLASS;
    input.className = SEARCH_INPUT_CLASS;
    input.placeholder = "Filter";
    input.spellcheck = false;
    wrapper.appendChild(input);
    this.node.appendChild(wrapper);

    let addFilter = document.createElement("div");
    addFilter.classList.add(SEARCH_FILTER);
    addFilter.classList.add("added");
    addFilter.addEventListener("click", this.filter.bind(this, addFilter));

    let removeFilter = document.createElement("div");
    removeFilter.classList.add(SEARCH_FILTER);
    removeFilter.classList.add("removed");
    removeFilter.addEventListener(
      "click",
      this.filter.bind(this, removeFilter)
    );

    let changeFilter = document.createElement("div");
    changeFilter.classList.add(SEARCH_FILTER);
    changeFilter.classList.add("changed");
    changeFilter.addEventListener(
      "click",
      this.filter.bind(this, changeFilter)
    );

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

    this.node.appendChild(addFilter);
    this.node.appendChild(removeFilter);
    this.node.appendChild(changeFilter);
    this.node.appendChild(starFilter);
    this.node.appendChild(commentFilter);
  }

  get addedButton() {
    return this.node.getElementsByClassName("added")[0];
  }

  get removedButton() {
    return this.node.getElementsByClassName("removed")[0];
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

  filter(button: HTMLElement) {
    if (button.classList.contains("highlight"))
      button.classList.remove("highlight");
    else button.classList.add("highlight");

    if (this.view.runList.isVisible) this._runFilters();
  }

  private _filterRunByAdded(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        return (
          r.cells.find(cell => {
            return cell.changeType === ChangeType.ADDED;
          }) !== undefined
        );
      },
      label: "cells added"
    };
  }

  private _filterRunByRemoved(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        return (
          r.cells.find(cell => {
            return cell.changeType === ChangeType.REMOVED;
          }) !== undefined
        );
      },
      label: "cells removed"
    };
  }

  private _filterRunByChanged(): FilterFunction<Run> {
    return {
      filter: (r: Run) => {
        return (
          r.cells.find(cell => {
            return cell.changeType === ChangeType.CHANGED;
          }) !== undefined
        );
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

  private _runFilters(): void {
    let filterList: FilterFunction<Run>[] = [];
    if (this.addedButton.classList.contains("highlight"))
      filterList.push(this._filterRunByAdded());
    if (this.removedButton.classList.contains("highlight"))
      filterList.push(this._filterRunByRemoved());
    if (this.changedButton.classList.contains("highlight"))
      filterList.push(this._filterRunByChanged());
    if (this.starButton.classList.contains("highlight"))
      filterList.push(this._filterRunByStar());
    if (this.commentButton.classList.contains("highlight"))
      filterList.push(this._filterRunByComment());

    if (filterList.length < 1) this.view.runList.clearFilters();
    else {
      let filter = (r: Run) => filterList.every(f => f.filter(r));
      let label = "";
      filterList.forEach(f => (label += f.label + " and "));
      label = label.substring(0, label.length - 5);
      this.view.runList.filterRunList({ filter, label });
    }
  }
}

export interface FilterFunction<i> {
  filter: (r: i) => boolean;
  label: string;
}
