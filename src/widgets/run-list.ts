import { Widget } from "@phosphor/widgets";

import "../../style/index.css";

import { HistoryModel } from "../history-model";

import { Run, RunDateList } from "../run";

import { RunItem } from "./run-item";

import { RunSection } from "./run-section";

const RUN_ITEM_ACTIVE = "jp-mod-active";

export class RunList extends Widget {
  readonly historyModel: HistoryModel;
  selectedRun: RunItem;
  sections: { date: number; section: RunSection }[];

  constructor(historyModel: HistoryModel) {
    super();
    this.historyModel = historyModel;
    this.sections = [];

    var runDateList = this.historyModel.runModel.runDateList;

    runDateList.forEach((runDate: RunDateList) => {
      var date = Run.formatDate(runDate.date);
      var dateSection = new RunSection(
        this.historyModel,
        "runs",
        date,
        this.onClick.bind(this),
        runDate.runList
      );

      this.sections.push({
        date: runDate.date.getTime(),
        section: dateSection
      });
      this.node.appendChild(dateSection.node);
    });

    this.historyModel.runModel.newRun.connect(this.addNewRun.bind(this));
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private onClick(runItem: RunItem, event: Event) {
    console.log("Run item ", runItem);
    if (this.selectedRun)
      this.selectedRun.node.classList.remove(RUN_ITEM_ACTIVE);

    runItem.node.classList.add(RUN_ITEM_ACTIVE);
    this.selectedRun = runItem;

    let target = event.target as HTMLElement;
    if (target.classList.contains("v-VerdantPanel-runItem-caret"))
      runItem.caretClicked();
    else {
      console.log("Open old version of notebook", runItem.run);
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
        "runs",
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
      this.node.insertBefore(dateSection.node, this.node.firstChild);
    else this.node.appendChild(dateSection.node);
  }
}
