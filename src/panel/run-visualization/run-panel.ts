import { Widget } from "@phosphor/widgets";

import { History } from "../../model/history";

import { RunDate } from "../../model/run";

import { RunItem } from "./run-item";

import { RunSection } from "./run-section";

import { VerdantPanel } from "../verdant-panel";

const NOTEBOOK_HISTORY = "v-VerdantPanel-notebookHistory";
const RUN_LIST = "v-VerdantPanel-runContainer";
const RUN_LIST_FOOTER = "v-VerdantPanel-footer";
const SEARCH_FILTER_RESULTS = "v-VerdantPanel-search-results-label";

export class RunPanel extends Widget {
  readonly historyModel: History;
  readonly parentPanel: VerdantPanel;
  private listContainer: HTMLElement;
  readonly actions: RunActions;
  sections: RunSection[];

  constructor(historyModel: History, parentPanel: VerdantPanel) {
    super();
    this.historyModel = historyModel;
    this.actions = new RunActions(this);
    this.parentPanel = parentPanel;
    this.sections = [];
    this.addClass(NOTEBOOK_HISTORY);

    // got to give a chance for new versions to load in
    this.historyModel.inspector.ready.then(async () => {
      this.historyModel.notebook.ready.then(async () => {
        this.init();
      });
    });
  }

  private init() {
    /*let labelWrapper = document.createElement("div");
    let label = document.createElement("div");
    label.textContent = "";
    label.classList.add(SEARCH_FILTER_RESULTS);
    labelWrapper.appendChild(label);
    let xButton = document.createElement("div");
    xButton.classList.add(SEARCH_CANCEL_BUTTON);
    labelWrapper.appendChild(xButton);
    xButton.addEventListener("click", () => {
      this.parentPanel.searchBar.clearFilters();
      this.clearFilters();
    });
    labelWrapper.style.display = "none";
    this.node.appendChild(labelWrapper);*/
    this.listContainer = this.buildRunList();
    this.node.appendChild(this.listContainer);
    this.buildFooter();
    this.historyModel.runModel.newRunDate.connect(
      (_: any, runDate: RunDate) => {
        this.addRunDate(runDate, this.listContainer);
      },
      this
    );
  }

  public onGhostBookOpened() {
    this.actions.onGhostBookOpened();
  }

  public onGhostBookClosed() {
    this.actions.onGhostBookClosed();
  }

  public get listLabel() {
    return this.node.getElementsByClassName(
      SEARCH_FILTER_RESULTS
    )[0] as HTMLElement;
  }

  private buildFooter() {
    let footer = document.createElement("div");
    footer.classList.add(RUN_LIST_FOOTER);
    this.node.appendChild(footer);
  }

  public async loadNotebook(runItem: RunItem) {
    let runID = -1;
    if (runItem.runs.length === 1) runID = runItem.runs.first.id;
    let wasOpen = await this.historyModel.inspector.produceNotebook(
      runItem.runs.id,
      runID
    );
    if (wasOpen) runItem.nodeClicked();
    console.log("load notebook!!!");
  }

  /*(public filterRunList(fun: FilterFunction<Run>) {
    let matchCount = 0;
    this.sections.forEach(section => {
      matchCount += section.filter(fun);
    });

    let label = this.listLabel;
    label.textContent = matchCount + " runs found with " + fun.label;
    label.parentElement.style.display = "";
  }

  public filterByText(text: string) {
    let matchCount = 0;
    this.sections.forEach(section => {
      matchCount += section.filterByText(text);
    });

    let label = this.listLabel;
    if (label.textContent.length > 0)
      label.textContent = label.textContent + " and ";

    label.textContent =
      label.textContent +
      matchCount +
      ' runs found with the text "' +
      text +
      '"';
    label.parentElement.style.display = "";
  }

  public clearFilters() {
    this.sections.forEach(section => section.clearFilters());
    this.listLabel.parentElement.style.display = "none";
    this.listLabel.textContent = "";
  }*/

  private buildRunList(): HTMLElement {
    var listContainer = document.createElement("div");
    listContainer.classList.add(RUN_LIST);
    var runDateList = this.historyModel.runModel.runDateList;
    runDateList.forEach((runDate: RunDate) => {
      this.addRunDate(runDate, listContainer);
    });
    return listContainer;
  }

  private addRunDate(runDate: RunDate, listContainer: HTMLElement) {
    let dateSection = new RunSection(
      this.historyModel.runModel,
      "Runs",
      runDate,
      this.actions
    );
    listContainer.insertBefore(dateSection.node, listContainer.firstChild);
    this.sections.push(dateSection);
  }
}

export class RunActions {
  public selectedRun: RunItem;
  readonly panel: RunPanel;

  constructor(panel: RunPanel) {
    this.panel = panel;
  }

  public onGhostBookOpened() {
    if (this.selectedRun) this.selectedRun.nodeClicked();
  }

  public onGhostBookClosed() {
    if (this.selectedRun) this.selectedRun.blur();
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  public async onClick(runItem: RunItem, event: Event) {
    console.log("Run item ", runItem, event);

    let target = event.target as HTMLElement;
    if (target.classList.contains("v-VerdantPanel-runItem-caret")) {
      runItem.caretClicked();
    } else {
      if (this.selectedRun) this.selectedRun.blur();

      this.selectedRun = runItem.animLoading();
      setTimeout(() => {
        if (this.selectedRun) {
          this.panel.loadNotebook(runItem);
        }
      }, 5);
    }
  }

}
