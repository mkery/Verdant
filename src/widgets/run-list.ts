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
      var date = this.formatDate(runDate.date);
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

  private formatDate(date: Date): string {
    var monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    var dateDesc = "";

    if (this.sameDay(today, date)) dateDesc = "today ";
    else if (this.sameDay(yesterday, date)) dateDesc = "yesterday ";

    dateDesc +=
      monthNames[date.getMonth()] +
      " " +
      date.getDate() +
      " " +
      date.getFullYear();
    return dateDesc;
  }

  private sameDay(d1: Date, d2: Date) {
    return (
      d1.getUTCFullYear() == d2.getUTCFullYear() &&
      d1.getUTCMonth() == d2.getUTCMonth() &&
      d1.getUTCDate() == d2.getUTCDate()
    );
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private onClick(runItem: RunItem, event: Event) {
    if (this.selectedRun)
      this.selectedRun.node.classList.remove(RUN_ITEM_ACTIVE);

    runItem.node.classList.add(RUN_ITEM_ACTIVE);
    this.selectedRun = runItem;

    let target = event.target as HTMLElement;
    if (target.classList.contains("v-VerdantPanel-runItem-caret"))
      runItem.caretClicked();
    else console.log("Open old version of notebook");
  }

  private addNewRun(sender: any, run: Run) {
    var date = new Date(run.timestamp);
    var section = this.sections.find(elem =>
      this.sameDay(new Date(elem.date), date)
    );

    if (!section) {
      var dateSection = new RunSection(
        this.historyModel,
        "runs",
        this.formatDate(new Date(run.timestamp)),
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
