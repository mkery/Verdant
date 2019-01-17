import { Widget } from "@phosphor/widgets";
import { History } from "../../lilgit/model/history";
import { VersionSampler } from "../sampler/version-sampler";
import { Nodey } from "../../lilgit/model/nodey";
import { VerdantPanel } from "./verdant-panel";
import { FilterBox } from "./details/filter-box";
import { CheckpointType } from "../../lilgit/model/checkpoint";

const PANEL = "v-VerdantPanel-content";
const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
const SEARCH_CONTENT = "v-VerdantPanel-searchContent";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const RESULT_CATEGORY = "VerdantPanel-search-results-category";
const RESULT_HEADER = "VerdantPanel-search-results-header";
const RESULT_CATEGORY_CONTENT = "VerdantPanel-search-results-category-content";

export class Search extends Widget {
  readonly history: History;
  readonly searchContent: HTMLElement;
  readonly parentPanel: VerdantPanel;
  private query: Query;
  private filterBox: FilterBox;

  constructor(history: History, parentPanel: VerdantPanel) {
    super();
    this.node.classList.add(PANEL);
    this.history = history;
    this.parentPanel = parentPanel;
    this.query = new Query();

    let searchContainer = document.createElement("div");
    searchContainer.classList.add(SEARCH_CONTAINER);

    let searchIcon = document.createElement("div");
    searchIcon.classList.add(SEARCH_ICON);

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

    let filters = {
      "cell deleted": (nodey: Nodey) => {
        let ev = this.history.checkpoints.get(nodey.created);
        if (ev) return ev.checkpointType === CheckpointType.DELETE;
      },
      "cell added": (nodey: Nodey) => {
        let ev = this.history.checkpoints.get(nodey.created);
        if (ev) return ev.checkpointType === CheckpointType.ADD;
      }
    };
    this.filterBox = new FilterBox(filters, this.lookFor.bind(this));

    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchText);
    searchContainer.appendChild(this.filterBox.node);

    this.node.appendChild(searchContainer);
    this.node.appendChild(this.filterBox.filterTagBin);

    this.searchContent = document.createElement("div");
    this.searchContent.classList.add(SEARCH_CONTENT);
    this.node.appendChild(this.searchContent);
  }

  lookFor(textQuery?: string) {
    this.searchContent.innerHTML = "";

    if (textQuery || textQuery === "") this.query.textQuery = textQuery;
    this.query.filters = this.filterBox.getActiveFilters();

    if (this.query.length > 0) {
      let query = this.query.textQuery;
      let filter = this.query.combined;
      let markdown = this.history.store.findMarkdown(query, filter);
      let code = this.history.store.findCode(query, filter);
      let output = this.history.store.findOutput(query, filter);

      let codeArea = this.buildResultSection(code, "code artifacts", query);
      this.searchContent.appendChild(codeArea);

      let markdownArea = this.buildResultSection(markdown, "markdown", query);
      this.searchContent.appendChild(markdownArea);

      let outputArea = this.buildResultSection(output, "output", query);
      this.searchContent.appendChild(outputArea);
    }
  }

  buildResultSection(results: Nodey[][], header: string, query: string) {
    let totalResults = 0;

    let area = document.createElement("div");
    area.classList.add(RESULT_CATEGORY);
    let label = document.createElement("div");
    label.classList.add(RESULT_HEADER);
    area.appendChild(label);

    let content = document.createElement("div");
    content.classList.add(RESULT_CATEGORY_CONTENT);
    area.appendChild(content);
    results.forEach(item => {
      totalResults += item.length;
      let container = document.createElement("div");
      let elem = VersionSampler.sampleSearch(
        this.history,
        item,
        query,
        () => {
          this.parentPanel.openCrumbBox(item[0]);
        },
        this.parentPanel.openGhostBook.bind(this.parentPanel)
      );
      container.appendChild(elem);
      content.appendChild(container);
    });

    VersionSampler.addCaret(label, content);
    let textContent = document.createElement("span");
    if (results.length > 1)
      textContent.textContent = "(" + totalResults + " matches) " + header;
    else textContent.textContent = "(" + totalResults + " match) " + header;
    label.appendChild(textContent);

    return area;
  }
}

class Query {
  textQuery: string = "";
  filters: ((nodey: Nodey) => boolean)[] = [];

  get combined() {
    return (nodey: Nodey) => {
      return this.filters.every(fun => fun(nodey));
    };
  }

  get length() {
    return this.textQuery.length + this.filters.length;
  }
}
