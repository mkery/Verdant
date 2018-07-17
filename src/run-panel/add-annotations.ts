import { Run } from "../model/run";

import { HistoryModel } from "../model/history";

const NOTES = "v-VerdantPanel-noteContainer";
const STAR_BUTTON = "v-VerdantPanel-starButton";
const NOTE_ICON = "v-VerdantPanel-noteIcon";
const NOTE_INPUT = "v-VerdantPanel-noteInput";

export class AddAnnotations {
  historyModel: HistoryModel;
  node: HTMLElement;
  run: Run;

  constructor(run: Run, historyModel: HistoryModel) {
    this.run = run;
    this.historyModel = historyModel;
  }

  private buildTextArea(): HTMLElement {
    let input = document.createElement("textarea");
    input.addEventListener("keyup", () => {
      input.style.height = "1em";
      input.style.height = input.scrollHeight + "px";
    });
    input.spellcheck = true;
    input.placeholder = "make a note";
    input.classList.add(NOTE_INPUT);
    if (this.run.note > -1)
      input.value = this.historyModel.getNote(this.run.note).text;
    input.addEventListener("input", this.updateNote.bind(this, input));
    input.addEventListener("keypress", this.updateNote.bind(this, input));
    return input;
  }

  buildHeaderNotes(): HTMLElement {
    let noteBar = document.createElement("div");
    noteBar.classList.add(NOTES);

    let commentIcon = document.createElement("div");
    commentIcon.classList.add(NOTE_ICON);
    commentIcon.classList.add("header");

    let inputBox = this.buildTextArea();
    inputBox.spellcheck = false;
    noteBar.appendChild(commentIcon);
    noteBar.appendChild(inputBox);
    return noteBar;
  }

  buildDetailNotes(): HTMLElement {
    let noteBar = document.createElement("div");
    noteBar.classList.add(NOTES);

    let star = document.createElement("div");
    star.classList.add(STAR_BUTTON);
    if (this.run.star > -1) star.classList.add("highlight");
    star.addEventListener("click", this.star.bind(this, star));

    let commentIcon = document.createElement("div");
    commentIcon.classList.add(NOTE_ICON);

    let inputBox = this.buildTextArea();
    noteBar.appendChild(star);
    noteBar.appendChild(commentIcon);
    noteBar.appendChild(inputBox);
    return noteBar;
  }

  star(starDiv: HTMLElement) {
    if (starDiv.classList.contains("highlight")) {
      starDiv.classList.remove("highlight");
      this.run.star = -1;
    } else {
      starDiv.classList.add("highlight");
      let star = this.historyModel.registerStar(this.run);
      this.run.star = star.id;
    }
  }

  updateNote(noteInput: HTMLTextAreaElement) {
    if (this.run.note === -1) {
      let note = this.historyModel.registerNote(noteInput.value, this.run);
      this.run.note = note.id;
    }
    this.historyModel.getNote(this.run.note).text = noteInput.value;
  }
}
