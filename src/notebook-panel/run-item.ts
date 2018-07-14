import { Run, ChangeType } from "../model/run";

import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../model/history";

import { VerdantListItem } from "./run-list";

import { DotMap } from "./dot-map";

import { RunNotes } from "./run-notes";

const RUN_ITEM_ACTIVE = "jp-mod-active";
const RUN_ITEM_CLASS = "v-VerdantPanel-runItem";
const RUN_ITEM_CARET = "v-VerdantPanel-runItem-caret";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const RUN_ITEM_NUMBER = "v-VerdantPanel-runItem-number";
const RUN_ITEM_TIME = "v-VerdantPanel-runItem-time";

const SUB_RUNLIST_CLASS = "v-VerdantPanel-runCluster-list";
const MAP_CELLBOX = "v-VerdantPanel-runCellMap-cellBox";
const MAP_CELLBOX_DESCCONTAINER = "v-VerdantPanel-runCellMap-cellBox-descBox";
const MAP_CELLBOX_LABEL = "v-VerdantPanel-runCellMap-label";
const MAP_CELLBOX_BUTTON = "v-VerdantPanel-runCellMap-button";
const MAP_CELLBOX_ICON = "v-VerdantPanel-runCellMap-cellbox-icon";

export class RunItem extends Widget implements VerdantListItem {
  readonly run: Run;
  readonly header: HTMLElement;
  readonly dotMap: DotMap;
  readonly notes: RunNotes;
  readonly historyModel: HistoryModel;

  constructor(run: Run, historyModel: HistoryModel) {
    super();
    this.historyModel = historyModel;
    this.run = run;

    let caret = document.createElement("div");
    caret.classList.add(RUN_ITEM_CARET);

    let number = document.createElement("div");
    number.textContent = "" + run.id;
    number.classList.add(RUN_ITEM_NUMBER);

    let eventLabel = document.createElement("div");
    eventLabel.textContent = run.checkpointType;
    eventLabel.classList.add(RUN_LABEL);

    let time = document.createElement("div");
    time.textContent = Run.formatTime(new Date(this.run.timestamp));
    time.classList.add(RUN_ITEM_TIME);

    this.dotMap = new DotMap(this.run.cells);

    this.notes = new RunNotes(this.run, this.historyModel);

    this.header = document.createElement("div");
    this.header.classList.add(RUN_ITEM_CLASS);
    this.header.appendChild(caret);
    this.header.appendChild(number);
    this.header.appendChild(eventLabel);
    this.header.appendChild(time);
    this.header.appendChild(this.dotMap.node);

    this.node.appendChild(this.header);
  }

  blur() {
    this.dotMap.blur();
    let caret = this.header.firstElementChild;
    caret.classList.remove("highlight");
    this.header.classList.remove(RUN_ITEM_ACTIVE);
    var icons = this.header.getElementsByClassName(MAP_CELLBOX_ICON);
    for (var i = 0; i < icons.length; i++)
      icons[i].classList.remove("highlight");
  }

  nodeClicked() {
    let caret = this.header.firstElementChild;
    caret.classList.add("highlight");
    this.header.classList.add(RUN_ITEM_ACTIVE);
    var icons = this.header.getElementsByClassName(MAP_CELLBOX_ICON);
    for (var i = 0; i < icons.length; i++) icons[i].classList.add("highlight");
    this.dotMap.highlight();
    return this;
  }

  caretClicked() {
    console.log("Caret was clicked!");
    var caret = this.node.firstElementChild;
    if (this.hasClass("open")) {
      caret.classList.remove("open");
      this.removeClass("open");
      this.node.removeChild(
        this.node.getElementsByClassName(SUB_RUNLIST_CLASS)[0]
      );
    } else {
      caret.classList.add("open");
      this.addClass("open");
      let dropdown = document.createElement("ul");
      dropdown.classList.add(SUB_RUNLIST_CLASS);
      this.run.cells.forEach(cell => {
        var cellVer = this.historyModel.getNodey(cell.node).version + 1;
        if (cell.changeType === ChangeType.SAME) {
          if (cell.run) {
            dropdown.appendChild(
              this.createCellDetail(
                "same",
                ["ran version " + cellVer + " of cell"],
                []
              )
            );
          }
          return;
        }

        switch (cell.changeType) {
          case ChangeType.ADDED:
            dropdown.appendChild(
              this.createCellDetail("added", ["cell created"], [])
            );
            break;
          case ChangeType.REMOVED:
            dropdown.appendChild(
              this.createCellDetail("removed", ["cell deleted"], ["restore"])
            );
            break;
          case ChangeType.CHANGED:
            dropdown.appendChild(
              this.createCellDetail(
                "changed",
                ["++N --K", "ran version " + cellVer + " of cell"],
                ["compare"]
              )
            );
            break;
        }
      });
      dropdown.appendChild(this.notes.buildNotes());
      this.node.appendChild(dropdown);
    }
  }

  private createCellDetail(
    changeClass: string,
    descLabels: string[],
    buttonLabels: string[]
  ) {
    let cellContainer = document.createElement("div");

    //cell box
    let cellBox = document.createElement("div");
    let cellIcon = document.createElement("div");
    cellBox.classList.add(MAP_CELLBOX);
    cellBox.classList.add(changeClass);
    cellIcon.classList.add(MAP_CELLBOX_ICON);
    cellIcon.classList.add(changeClass);
    cellBox.appendChild(cellIcon);
    cellContainer.appendChild(cellBox);

    let descContainer = document.createElement("div");
    descContainer.classList.add(MAP_CELLBOX_DESCCONTAINER);

    //descriptions
    descLabels.forEach(desc => {
      let label = document.createElement("div");
      label.textContent = desc;
      label.classList.add(MAP_CELLBOX_LABEL);
      descContainer.appendChild(label);
    });

    //buttons
    buttonLabels.forEach(label => {
      let actionLabel = document.createElement("div");
      actionLabel.textContent = label;
      actionLabel.classList.add(MAP_CELLBOX_BUTTON);
      descContainer.appendChild(actionLabel);
    });

    cellContainer.appendChild(descContainer);

    return cellContainer;
  }
}
