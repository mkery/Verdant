import { Widget } from "@phosphor/widgets";

import { Run } from "../model/run";

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

    let starFilter = document.createElement("div");
    starFilter.classList.add(SEARCH_FILTER);
    starFilter.classList.add("star");
    starFilter.addEventListener("click", this.filterByStar.bind(this));

    let commentFilter = document.createElement("div");
    commentFilter.classList.add(SEARCH_FILTER);
    commentFilter.classList.add("comment");
    commentFilter.addEventListener("click", this.filterByComment.bind(this));

    this.node.appendChild(starFilter);
    this.node.appendChild(commentFilter);
  }

  get starButton() {
    return this.node.getElementsByClassName("star")[0];
  }

  get commentButton() {
    return this.node.getElementsByClassName("comment")[0];
  }

  filterByComment() {
    let comment = this.commentButton;

    if (comment.classList.contains("highlight"))
      comment.classList.remove("highlight");
    else comment.classList.add("highlight");

    if (this.view.runList.isVisible) this._runFilters();
  }

  private _filterRunByComment(): FilterFunction<Run> {
    return {
      filter: (r: Run) => r.note > -1,
      label: "a comment"
    };
  }

  filterByStar() {
    let star = this.starButton;

    if (star.classList.contains("highlight")) {
      star.classList.remove("highlight");
    } else star.classList.add("highlight");

    if (this.view.runList.isVisible) this._runFilters();
  }

  private _filterRunByStar(): FilterFunction<Run> {
    return {
      filter: (r: Run) => r.star > -1,
      label: "stars"
    };
  }

  private _runFilters(): void {
    let filterList: FilterFunction<Run>[] = [];
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
