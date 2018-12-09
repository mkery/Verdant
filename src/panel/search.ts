import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { VersionSampler } from "./details/version-sampler";
import { Nodey } from "../model/nodey";

const PANEL = "v-VerdantPanel-content";
const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
const SEARCH_CONTENT = "v-VerdantPanel-searchContent";
//const FILTER_OPTS_ICON = "v-VerdantPanel-filterOptsIcon";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const RESULT_CATEGORY = "VerdantPanel-search-results-category";
const RESULT_HEADER = "VerdantPanel-search-results-header";
const RESULT_CATEGORY_CONTENT = "VerdantPanel-search-results-category-content";
const RESULT_CATEGORY_FOOTER = "VerdantPanel-search-results-category-footer";
const RESULT_HEADER_BUTTON = "VerdantPanel-search-results-header-button";

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
    this.searchContent.classList.add(SEARCH_CONTENT);
    this.node.appendChild(this.searchContent);
  }

  lookFor(query: string) {
    this.searchContent.innerHTML = "";
    if (query.length > 0) {
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
  }

  buildResultSection(results: Nodey[], header: string) {
    let area = document.createElement("div");
    area.classList.add(RESULT_CATEGORY);
    let label = document.createElement("div");
    label.classList.add(RESULT_HEADER);
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
    area.appendChild(footer);

    /*
    * animated button, thus the extra divs
    */
    let button = document.createElement("div");
    button.classList.add(RESULT_HEADER_BUTTON);
    button.classList.add("closed");
    label.appendChild(button);
    let circle = document.createElement("div");
    circle.classList.add("circle");
    button.appendChild(circle);
    let horizontal = document.createElement("div");
    horizontal.classList.add("horizontal");
    circle.appendChild(horizontal);
    let vertical = document.createElement("div");
    vertical.classList.add("vertical");
    circle.appendChild(vertical);
    button.addEventListener("mousedown", () => {
      if (button.classList.contains("opened")) {
        button.classList.remove("opened");
        button.classList.add("closed");
        setTimeout(() => {
          content.style.display = "";
          footer.style.display = "";
        }, 300);
      } else if (button.classList.contains("closed")) {
        button.classList.remove("closed");
        button.classList.add("opened");
        setTimeout(() => {
          content.style.display = "block";
          footer.style.display = "block";
        }, 300);
      }
    });

    let textContent = document.createElement("span");
    if (results.length > 1)
      textContent.textContent = "(" + results.length + " matches) " + header;
    else textContent.textContent = "(" + results.length + " match) " + header;
    label.appendChild(textContent);

    return area;
  }
}
