import { Widget, TabBar, PanelLayout } from "@phosphor/widgets";

import { NotebookPanel } from "@jupyterlab/notebook";

import "../../style/index.css";

import { Model } from "../model";

import { SearchBar } from "./search-bar";

import { RunList } from "./run-list";

import { CellPanel } from "./cell-panel";

const TABS_ID = "v-VerdantPanel-tabs";
const HEADER_NOTEBOOK_LABEL = "v-VerdantPanel-header-notebookLabel";
const HEADER_TITLE = "v-VerdantPanel-header-title";
const HEADER_CELL_LABEL = "v-VerdantPanel-header-cellLabel";

/**
 * A widget which displays notebook-level history information
 */
export class VerdantPanel extends Widget {
  readonly historyModel: Model;
  readonly fileTabs: TabBar<Widget>;
  readonly searchBar: SearchBar;
  readonly runList: RunList;
  readonly cellPanel: CellPanel;
  readonly layout: PanelLayout;

  constructor(historyModel: Model) {
    super();
    this.addClass("v-VerdantPanel");
    this.historyModel = historyModel;

    this.fileTabs = new TabBar<Widget>({ orientation: "vertical" });
    this.fileTabs.id = TABS_ID;

    this.searchBar = new SearchBar();

    this.runList = new RunList(this.historyModel);
    this.cellPanel = new CellPanel(this.historyModel);

    let layout = new PanelLayout();
    layout.addWidget(this.fileTabs);
    layout.addWidget(this.searchBar);
    layout.addWidget(this.runList);
    layout.addWidget(this.cellPanel);
    this.cellPanel.hide();

    let header = this.buildHeaderNode();
    this.fileTabs.node.insertBefore(header, this.fileTabs.contentNode);

    this.layout = layout;
  }

  onNotebookSwitch(widg: NotebookPanel) {
    this.fileTabs.clearTabs();
    this.fileTabs.addTab(widg.title);
  }

  private buildHeaderNode() {
    let header = document.createElement("header");

    let title = document.createElement("span");
    title.textContent = "history of";
    title.classList.add(HEADER_TITLE);

    let notebookLabel = document.createElement("div");
    notebookLabel.textContent = "notebook";
    notebookLabel.classList.add(HEADER_NOTEBOOK_LABEL);
    notebookLabel.addEventListener(
      "click",
      this.switchToNotebookHistory.bind(this)
    );

    let cellLabel = document.createElement("div");
    cellLabel.textContent = "cell";
    cellLabel.classList.add(HEADER_CELL_LABEL);
    cellLabel.classList.add("closed");
    cellLabel.addEventListener("click", this.switchToCellHistory.bind(this));

    header.appendChild(title);
    header.appendChild(notebookLabel);
    header.appendChild(cellLabel);

    return header;
  }

  public switchToNotebookHistory() {
    this.runList.show();
    this.cellPanel.hide();
    this.node
      .getElementsByClassName(HEADER_NOTEBOOK_LABEL)[0]
      .classList.remove("closed");
    this.node
      .getElementsByClassName(HEADER_CELL_LABEL)[0]
      .classList.add("closed");
  }

  public switchToCellHistory() {
    this.runList.hide();
    this.cellPanel.show();
    this.node
      .getElementsByClassName(HEADER_NOTEBOOK_LABEL)[0]
      .classList.add("closed");
    this.node
      .getElementsByClassName(HEADER_CELL_LABEL)[0]
      .classList.remove("closed");
  }
}
