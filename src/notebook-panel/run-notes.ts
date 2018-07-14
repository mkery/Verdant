import { Run } from "../model/run";

import{ HistoryModel } from "../model/history"

const NOTES = "v-VerdantPanel-noteContainer";
const STAR_BUTTON = "v-VerdantPanel-starButton";
const NOTE_INPUT = "v-VerdantPanel-noteInput";
const NOTES_INPUT_BOX = "v-VerdantPanel-noteInput-box";

export class RunNotes {
  historyModel: HistoryModel
  node: HTMLElement;
  run: Run;

  constructor(run: Run, historyModel: HistoryModel) {
    this.run = run;
    this.historyModel = historyModel
  }

  buildNotes(): HTMLElement {
    let noteBar = document.createElement("div");
    noteBar.classList.add(NOTES);

    let star = document.createElement("div");
    star.classList.add(STAR_BUTTON);
    if(this.run.star > -1)
      star.classList.add("highlight");
    star.addEventListener("click", this.star.bind(this, star));

    let inputBox = document.createElement("div");
    inputBox.classList.add(NOTES_INPUT_BOX);
    inputBox.addEventListener("mousedown", (ev: Event) => ev.stopPropagation());
    inputBox.addEventListener("mouseup", (ev: Event) => ev.stopPropagation());

    let input = document.createElement("textarea");
    input.spellcheck = true;
    input.placeholder = "make a note";
    input.classList.add(NOTE_INPUT);
    if(this.run.note > -1)
      input.value = this.historyModel.getNote(this.run.note).text
    input.addEventListener("input", this.updateNote.bind(this, input));
    input.addEventListener("keypress", this.updateNote.bind(this, input));

    inputBox.appendChild(input);
    noteBar.appendChild(star);
    noteBar.appendChild(inputBox);
    return noteBar;
  }

  star(starDiv: HTMLElement) {
    if (starDiv.classList.contains("highlight")) {
      starDiv.classList.remove("highlight");
      this.run.star = -1
    } else {
      starDiv.classList.add("highlight");
      let star = this.historyModel.registerStar(this.run)
      this.run.star = star.id
    }
  }

  updateNote(noteInput: HTMLTextAreaElement) {
    if(this.run.note === -1)
    {
      let note = this.historyModel.registerNote(noteInput.value, this.run)
      this.run.note = note.id
    }
    this.historyModel.getNote(this.run.note).text = noteInput.value;
  }
}
