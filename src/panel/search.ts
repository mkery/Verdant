import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { CellSampler } from "./details/cell-sampler";

const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
//const FILTER_OPTS_ICON = "v-VerdantPanel-filterOptsIcon";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const RESULT_MESSAGE = "VerdantPanel-search-results-message";

export class Search extends Widget {
  readonly history: History;
  readonly searchContent: HTMLElement;
  private query: string;

  constructor(history: History) {
    super();
    this.history = history;

    let searchContainer = document.createElement("div");
    searchContainer.classList.add(SEARCH_CONTAINER);

    let searchIcon = document.createElement("div");
    searchIcon.classList.add(SEARCH_ICON);
    /* //TODO let filterOptsIcon = document.createElement("div");
    filterOptsIcon.classList.add(FILTER_OPTS_ICON);*/
    let searchText = document.createElement("div");
    searchText.classList.add(SEARCH_TEXT);
    searchText.setAttribute("contentEditable", "true");
    searchText.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.keyCode === 13) {
        ev.preventDefault();
        ev.stopPropagation();
        this.lookFor(searchText.innerText);
      }
    });
    searchContainer.appendChild(searchIcon);
    //searchContainer.appendChild(filterOptsIcon);
    searchContainer.appendChild(searchText);

    this.node.appendChild(searchContainer);

    this.searchContent = document.createElement("div");
    this.node.appendChild(this.searchContent);
  }

  lookFor(query: string) {
    this.searchContent.innerHTML = "";
    this.query = query;

    let markdown = this.history.store.findMarkdown(query);

    let message = document.createElement("div");
    message.textContent =
      markdown.length + ' artifacts found with the text "' + this.query + '"';
    message.classList.add(RESULT_MESSAGE);
    this.searchContent.appendChild(message);

    markdown.forEach(item => {
      let elem = CellSampler.sampleCell(this.history, item);
      this.searchContent.appendChild(elem);
    });
  }
}
