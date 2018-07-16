import { Widget } from "@phosphor/widgets";

/*
 * History search bar
 */

const SEARCH_CONTAINER_CLASS = "v-VerdantPanel-search-container";
const SEARCH_BOX_CLASS = "v-VerdantPanel-search-box";
const SEARCH_INPUT_CLASS = "v-VerdantPanel-search-input";
const SEARCH_FILTER = "v-VerdantPanel-search-filter";

export class SearchBar extends Widget {
  constructor() {
    super();
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
    if (comment.classList.contains("highlight")) {
      comment.classList.remove("highlight");
    } else {
      comment.classList.add("highlight");
    }
  }

  filterByStar() {
    let star = this.starButton;
    if (star.classList.contains("highlight")) {
      star.classList.remove("highlight");
    } else {
      star.classList.add("highlight");
    }
  }
}
