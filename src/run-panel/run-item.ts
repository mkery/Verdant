import { Run, ChangeType, CellRunData } from "../model/run";

import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../model/history";

import { Sampler } from "../inspector-panel/sampler";

import { NodeyCell } from "../model/nodey";

import { VerdantListItem } from "./run-panel";

import { DotMap } from "./dot-map";

import { Annotator } from "./add-annotations";

import { RunCluster } from "./run-cluster";

const RUN_ITEM_CLASS = "v-VerdantPanel-runItem";
const RUN_ITEM_CARET = "v-VerdantPanel-runItem-caret";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const RUN_ITEM_ACTIVE = "jp-mod-active";
const RUN_ITEM_TIME = "v-VerdantPanel-runItem-time";

const RUN_SAMPLE_ROW = "v-VerdantPanel-runItem-sampleRow";
const RUN_SAMPLE_BUTTON = "v-VerdantPanel-runItem-sampleButton";
const RUN_ITEM_STAR = "v-VerdantPanel-starButton";
const NOTES = "v-VerdantPanel-noteContainer";

const SUB_RUNLIST_CLASS = "v-VerdantPanel-runCluster-list";
const MAP_CELLBOX_DESCCONTAINER = "v-VerdantPanel-runCellMap-cellBox-descBox";
const MAP_CELLBOX_LABEL = "v-VerdantPanel-runCellMap-label";
const MAP_CELLBOX_ICON = "v-VerdantPanel-runCellMap-cellbox-icon";

export class RunItem extends Widget implements VerdantListItem {
  readonly run: Run;
  readonly header: HTMLElement;
  readonly dotMap: DotMap;
  readonly historyModel: HistoryModel;
  readonly switchPane: () => any;
  cluster: RunCluster = null;

  constructor(run: Run, historyModel: HistoryModel, switchPane: () => any) {
    super();
    this.historyModel = historyModel;
    this.run = run;
    this.switchPane = switchPane;

    let caret = document.createElement("div");
    caret.classList.add(RUN_ITEM_CARET);

    let eventLabel = document.createElement("div");
    eventLabel.textContent = run.checkpointType;
    eventLabel.classList.add(RUN_LABEL);

    let time = document.createElement("div");
    time.textContent = Run.formatTime(new Date(this.run.timestamp));
    time.classList.add(RUN_ITEM_TIME);

    this.dotMap = new DotMap(this.historyModel, this.run.cells);

    this.header = document.createElement("div");
    this.header.classList.add(RUN_ITEM_CLASS);
    this.header.appendChild(caret);
    this.header.appendChild(eventLabel);
    this.header.appendChild(time);
    this.header.appendChild(this.dotMap.node);

    this.node.appendChild(this.header);
    this.buildHeaderAnnotations();
  }

  blur() {
    this.dotMap.blur();
    let caret = this.header.firstElementChild;
    caret.classList.remove("highlight");
    this.header.classList.remove(RUN_ITEM_ACTIVE);
    if (this.run.note > -1)
      this.header
        .getElementsByClassName(RUN_ITEM_STAR)[0]
        .classList.remove("highlight");
    var icons = this.header.getElementsByClassName(MAP_CELLBOX_ICON);
    for (var i = 0; i < icons.length; i++)
      icons[i].classList.remove("highlight");
  }

  nodeClicked() {
    let caret = this.header.firstElementChild;
    caret.classList.add("highlight");
    this.header.classList.add(RUN_ITEM_ACTIVE);
    if (this.run.star > -1)
      this.header
        .getElementsByClassName(RUN_ITEM_STAR)[0]
        .classList.add("highlight");
    var icons = this.header.getElementsByClassName(MAP_CELLBOX_ICON);
    for (var i = 0; i < icons.length; i++) icons[i].classList.add("highlight");
    this.dotMap.highlight();
    return this;
  }

  get link() {
    return this.header;
  }

  get caret() {
    return this.header.firstElementChild as HTMLElement;
  }

  caretClicked() {
    console.log("Caret was clicked!");
    if (!this.hasClass("open")) this.openHeader();
    else this.closeHeader();
  }

  private openHeader() {
    this.caret.classList.add("open");
    this.addClass("open");
    this.hideHeaderAnnotations();

    let dropdown = document.createElement("ul");
    dropdown.classList.add(SUB_RUNLIST_CLASS);
    dropdown.appendChild(
      Annotator.buildDetailNotes(this.run, this.historyModel)
    );
    this.buildDetailList(dropdown);
    this.node.appendChild(dropdown);
    if (this.cluster) this.cluster.clusterEvent(this);
  }

  public closeHeader() {
    // double check header is in fact open
    if (this.hasClass("open")) {
      this.caret.classList.remove("open");
      this.removeClass("open");
      this.node.removeChild(
        this.node.getElementsByClassName(SUB_RUNLIST_CLASS)[0]
      );
    }
    this.buildHeaderAnnotations();
    if (this.cluster) this.cluster.clusterEvent(this);
  }

  private hideHeaderAnnotations() {
    let next = this.caret.nextElementSibling;
    if (next.classList.contains(RUN_ITEM_STAR)) next.remove();
    let notes = this.node.getElementsByClassName(NOTES);
    if (notes.length > 0) this.node.removeChild(notes[0]);
  }

  private buildHeaderAnnotations() {
    let next = this.caret.nextElementSibling;
    if (this.run.star > -1 && !next.classList.contains(RUN_ITEM_STAR)) {
      let star = document.createElement("div");
      star.classList.add(RUN_ITEM_STAR);
      star.classList.add("header");
      this.header.insertBefore(star, next);
    }

    if (this.run.note > -1) {
      let noteText = Annotator.buildHeaderNotes(this.run, this.historyModel);
      noteText.classList.add("header");
      this.node.appendChild(noteText);
    }
  }

  private buildDetailList(dropdown: HTMLElement) {
    this.run.cells.forEach(cell => {
      let nodey = this.historyModel.getNodey(cell.node) as NodeyCell;
      //var cellVer = nodey.version + 1;
      if (cell.changeType === ChangeType.SAME) {
        if (cell.run) {
          dropdown.appendChild(
            this.createCellDetail("same", ["No changes to cell."], nodey, cell)
          );
        }
        return;
      }

      switch (cell.changeType) {
        case ChangeType.ADDED:
          dropdown.appendChild(
            this.createCellDetail("added", ["Cell created"], nodey, cell)
          );
          break;
        case ChangeType.REMOVED:
          dropdown.appendChild(
            this.createCellDetail("removed", ["Cell deleted"], nodey, cell)
          );
          break;
        case ChangeType.CHANGED:
          let changes = this.historyModel.inspector.getRunChangeCount(nodey);
          dropdown.appendChild(
            this.createCellDetail(
              "changed",
              [
                "Cell changes: ",
                "++" + changes.added + " --" + changes.deleted
              ],
              nodey,
              cell
            )
          );
          break;
      }
    });
  }

  private goToCellDetail(nodeyName: string) {
    let nodey = this.historyModel.getNodey(nodeyName);
    this.historyModel.inspector.changeTarget([nodey]);
    this.switchPane();
  }

  private gotToOutputDetail(outName: string) {
    let out = this.historyModel.getOutput(outName);
    this.historyModel.inspector.changeTarget([out]);
    this.switchPane();
  }

  private createCellDetail(
    _: string,
    descLabels: string[],
    nodey: NodeyCell,
    dat: CellRunData
  ) {
    let cellContainer = document.createElement("div");

    //descriptions
    let descContainer = document.createElement("div");
    descContainer.classList.add(MAP_CELLBOX_DESCCONTAINER);

    descLabels.forEach(desc => {
      let label = document.createElement("div");
      label.textContent = desc;
      label.classList.add(MAP_CELLBOX_LABEL);
      descContainer.appendChild(label);
    });
    cellContainer.appendChild(descContainer);

    //cell sample
    let sampleRow = document.createElement("div");
    sampleRow.classList.add(RUN_SAMPLE_ROW);
    let sample = Sampler.sampleCell(this.historyModel, nodey);
    let button = document.createElement("div");
    button.classList.add(RUN_SAMPLE_BUTTON);
    button.addEventListener(
      "click",
      this.goToCellDetail.bind(this, nodey.name)
    );
    sampleRow.appendChild(button);
    sampleRow.appendChild(sample);
    cellContainer.appendChild(sampleRow);

    //output sample
    if (dat.newOutput) {
      //descriptions
      let descOut = document.createElement("div");
      descOut.classList.add(MAP_CELLBOX_DESCCONTAINER);
      let outLabel = document.createElement("div");
      outLabel.textContent = "New cell outputs:";
      outLabel.classList.add(MAP_CELLBOX_LABEL);
      descOut.appendChild(outLabel);
      cellContainer.appendChild(descOut);

      dat.newOutput.forEach(num => {
        let out = this.historyModel.getOutput(num);
        let outputRow = document.createElement("div");
        outputRow.classList.add(RUN_SAMPLE_ROW);
        let sampleOut = Sampler.sampleOutput(this.historyModel, out);
        let outButton = document.createElement("div");
        outButton.addEventListener(
          "click",
          this.gotToOutputDetail.bind(this, num)
        );
        outButton.classList.add(RUN_SAMPLE_BUTTON);
        outputRow.appendChild(outButton);
        outputRow.appendChild(sampleOut);
        cellContainer.appendChild(outputRow);
      });
    }

    return cellContainer;
  }
}
