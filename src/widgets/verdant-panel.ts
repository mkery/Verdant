import { Widget, TabBar, PanelLayout } from "@phosphor/widgets";

import { NotebookPanel } from "@jupyterlab/notebook";

import "../../style/index.css";

import { Model } from "../model";

import { SearchBar } from "./search-bar";

import { RunList } from "./run-list";

const TABS_ID = "v-VerdantPanel-tabs";

/**
 * A widget which displays notebook-level history information
 */
export class VerdantPanel extends Widget {
  readonly historyModel: Model;
  readonly fileTabs: TabBar<Widget>;
  readonly searchBar: SearchBar;
  readonly runList: RunList;
  readonly layout: PanelLayout;

  constructor(historyModel: Model) {
    super();
    this.addClass("v-VerdantPanel");
    this.historyModel = historyModel;

    this.fileTabs = new TabBar<Widget>({ orientation: "vertical" });
    this.fileTabs.id = TABS_ID;

    this.searchBar = new SearchBar();

    this.runList = new RunList(this.historyModel);

    let layout = new PanelLayout();
    layout.addWidget(this.fileTabs);
    layout.addWidget(this.searchBar);
    layout.addWidget(this.runList);

    let header = document.createElement("header");
    header.textContent = "history of notebook";
    this.fileTabs.node.insertBefore(header, this.fileTabs.contentNode);

    this.layout = layout;
  }

  onNotebookSwitch(widg: NotebookPanel) {
    this.fileTabs.clearTabs();
    this.fileTabs.addTab(widg.title);
  }
}
