import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../history-model";

import { Run, RunDateList } from "../run";

import { RunItem } from "./run-item";

import { RunSection } from "./run-section";

import { Legend } from "./legend";

const NOTEBOOK_HISTORY = "v-VerdantPanel-notebookHistory";
const RUN_LIST = "v-VerdantPanel-runContainer";
const RUN_LIST_FOOTER = "v-VerdantPanel-footer";
const RUN_ITEM_NUMBER = "v-VerdantPanel-runItem-number";
const WORKING_VERSION = "v-VerdantPanel-workingItem";
const WORKING_VERSION_LABEL = "v-VerdantPanel-workingItem-label";

export class RunList extends Widget {
  readonly historyModel: HistoryModel;
  readonly listContainer: HTMLElement;
  selectedRun: RunItem;
  sections: { date: number; section: RunSection }[];

  constructor(historyModel: HistoryModel) {
    super();
    this.historyModel = historyModel;
    this.sections = [];

    this.addClass(NOTEBOOK_HISTORY);
    this.listContainer = this.buildRunList();
    this.node.appendChild(this.listContainer);

    let footer = document.createElement("div");
    footer.classList.add(RUN_LIST_FOOTER);
    let legend = new Legend();
    footer.appendChild(legend.button);
    footer.appendChild(legend.node);
    legend.node.style.display = "none";
    this.node.appendChild(footer);

    this.historyModel.runModel.newRun.connect(this.addNewRun.bind(this));
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private onClick(runItem: VerdantListItem, event: Event) {
    console.log("Run item ", runItem, event);

    let target = event.target as HTMLElement;
    if (target.classList.contains("v-VerdantPanel-runItem-caret")) {
      runItem.caretClicked();
    } else if (runItem) {
      if (this.selectedRun) this.selectedRun.blur();

      this.selectedRun = runItem.nodeClicked();
      if (this.selectedRun) {
        console.log("Open old version of notebook", this.selectedRun.run);
        this.historyModel.inspector.produceNotebook(this.selectedRun.run);
      }
    }
  }

  private buildRunList(): HTMLElement {
    var listContainer = document.createElement("div");
    listContainer.classList.add(RUN_LIST);
    var current = new WorkingItem();
    var today: RunSection = null;
    var runDateList = this.historyModel.runModel.runDateList;
    runDateList.forEach((runDate: RunDateList) => {
      let date = Run.formatDate(runDate.date);
      let dateSection = new RunSection(
        this.historyModel,
        "",
        date,
        this.onClick.bind(this),
        runDate.runList
      );

      this.sections.push({
        date: runDate.date.getTime(),
        section: dateSection
      });
      listContainer.appendChild(dateSection.node);

      if (!today && Run.sameDay(runDate.date, new Date())) today = dateSection;
    });

    if (!today) {
      let date = new Date();
      today = new RunSection(
        this.historyModel,
        "checkpoints",
        Run.formatDate(date),
        this.onClick.bind(this),
        []
      );

      this.sections.unshift({
        date: date.getTime(),
        section: today
      });
      listContainer.appendChild(today.node);
    }
    today.workingItem = current;
    return listContainer;
  }

  private addNewRun(sender: any, run: Run) {
    var date = new Date(run.timestamp);
    let section;
    for (let i = 0; i < this.sections.length; i++) {
      if (Run.sameDay(new Date(this.sections[i].date), date)) {
        section = this.sections[i];
        break;
      }
    }

    let dateSection;
    if (!section) {
      dateSection = new RunSection(
        this.historyModel,
        "",
        Run.formatDate(new Date(run.timestamp)),
        this.onClick.bind(this),
        [run]
      );

      this.sections.push({ date: run.timestamp, section: dateSection });
    } else {
      dateSection = section.section;
      dateSection.addNewRun(run, this.onClick.bind(this));
    }

    if (this.listContainer.firstChild)
      this.listContainer.insertBefore(
        dateSection.node,
        this.listContainer.firstChild.nextSibling
      );
    else this.listContainer.appendChild(dateSection.node);
  }
}

class WorkingItem extends Widget {
  constructor() {
    super();
    this.addClass(WORKING_VERSION);

    let number = document.createElement("div");
    number.textContent = "#*";
    number.classList.add(RUN_ITEM_NUMBER);

    let label = document.createElement("div");
    label.textContent = "current in-progress notebook";
    label.classList.add(WORKING_VERSION_LABEL);

    this.node.appendChild(number);
    this.node.appendChild(label);
  }
}

export interface VerdantListItem extends Widget {
  caretClicked: () => void;
  nodeClicked: () => RunItem;
  blur: () => void;
}
