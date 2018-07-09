import { Widget } from "@phosphor/widgets";

import "../../style/index.css";

import { HistoryModel } from "../history-model";

import { Run, RunDateList } from "../run";

import { RunItem } from "./run-item";

import { RunCluster } from "./run-cluster";

import { RunSection } from "./run-section";

const RUN_ITEM_ACTIVE = "jp-mod-active";
const RUN_LIST = "v-VerdantPanel-runContainer";
const RUN_ITEM_NUMBER = "v-VerdantPanel-runItem-number";
const WORKING_VERSION = "v-VerdantPanel-workingItem";
const WORKING_VERSION_LABEL = "v-VerdantPanel-workingItem-label";

export class RunList extends Widget {
  readonly historyModel: HistoryModel;
  selectedRun: RunItem;
  sections: { date: number; section: RunSection }[];

  constructor(historyModel: HistoryModel) {
    super();
    this.historyModel = historyModel;
    this.sections = [];

    this.addClass(RUN_LIST);

    var current = new WorkingItem();
    var today: RunSection = null;

    var runDateList = this.historyModel.runModel.runDateList;

    runDateList.forEach((runDate: RunDateList) => {
      var date = Run.formatDate(runDate.date);
      var dateSection = new RunSection(
        this.historyModel,
        "checkpoints",
        date,
        this.onClick.bind(this),
        runDate.runList
      );

      this.sections.push({
        date: runDate.date.getTime(),
        section: dateSection
      });
      this.node.appendChild(dateSection.node);

      if (!today && Run.sameDay(runDate.date, new Date())) today = dateSection;
    });

    if (!today) {
      var date = new Date();
      var today = new RunSection(
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
      this.node.appendChild(today.node);
    }
    today.workingItem = current;

    this.historyModel.runModel.newRun.connect(this.addNewRun.bind(this));
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private onClick(runItem: VerdantListItem, event: Event) {
    console.log("Run item ", runItem);

    let target = event.target as HTMLElement;
    if (
      runItem instanceof RunCluster ||
      target.classList.contains("v-VerdantPanel-runItem-caret")
    ) {
      runItem.caretClicked();
    } else if (runItem instanceof RunItem) {
      if (this.selectedRun)
        this.selectedRun.node.classList.remove(RUN_ITEM_ACTIVE);

      runItem.node.classList.add(RUN_ITEM_ACTIVE);
      console.log("Open old version of notebook", runItem.run);
      this.selectedRun = runItem;
      this.historyModel.inspector.produceNotebook(runItem.run);
    }
  }

  private addNewRun(sender: any, run: Run) {
    var date = new Date(run.timestamp);
    var section = this.sections.find(elem =>
      Run.sameDay(new Date(elem.date), date)
    );

    if (!section) {
      var dateSection = new RunSection(
        this.historyModel,
        "Checkpoints",
        Run.formatDate(new Date(run.timestamp)),
        this.onClick.bind(this),
        [run]
      );

      this.sections.push({ date: run.timestamp, section: dateSection });
    } else {
      dateSection = section.section;
      dateSection.addNewRun(run, this.onClick.bind(this));
    }

    if (this.node.firstChild)
      this.node.insertBefore(
        dateSection.node,
        this.node.firstChild.nextSibling
      );
    else this.node.appendChild(dateSection.node);
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
}
