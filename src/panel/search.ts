import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { VersionSampler } from "./details/version-sampler";
import { Nodey } from "../model/nodey";

const PANEL = "v-VerdantPanel-content";
const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
//const FILTER_OPTS_ICON = "v-VerdantPanel-filterOptsIcon";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const RESULT_CATEGORY = "VerdantPanel-search-results-category";
const RESULT_HEADER = "VerdantPanel-search-results-header";
const RESULT_CATEGORY_CONTENT = "VerdantPanel-search-results-category-content";
const RESULT_CATEGORY_FOOTER = "VerdantPanel-search-results-category-footer";

export class Search extends Widget {
  readonly history: History;
  readonly searchContent: HTMLElement;

  constructor(history: History) {
    super();
    this.node.classList.add(PANEL);
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

    let markdown = this.history.store.findMarkdown(query);
    let code = this.history.store.findCode(query);
    let output = this.history.store.findOutput(query);

    let codeArea = this.buildResultSection(code, "code artifacts");
    this.searchContent.appendChild(codeArea);

    let markdownArea = this.buildResultSection(markdown, "markdown");
    this.searchContent.appendChild(markdownArea);

    let outputArea = this.buildResultSection(output, "output");
    this.searchContent.appendChild(outputArea);
  }

  buildResultSection(results: Nodey[], header: string) {
    let area = document.createElement("div");
    area.classList.add(RESULT_CATEGORY);
    let label = document.createElement("div");
    label.classList.add(RESULT_HEADER);
    label.textContent = "(" + results.length + " found) " + header;
    area.appendChild(label);
    let content = document.createElement("div");
    content.classList.add(RESULT_CATEGORY_CONTENT);
    area.appendChild(content);

    results.forEach(item => {
      let elem = VersionSampler.sample(this.history, item);
      content.appendChild(elem);
    });

    let footer = document.createElement("div");
    footer.classList.add(RESULT_CATEGORY_FOOTER);
    footer.textContent = "...";
    area.appendChild(footer);
    return area;
  }
}
