import { Run } from "../run";

const NOTES = "v-VerdantPanel-noteContainer";
const STAR_BUTTON = "v-VerdantPanel-starButton";
const NOTE_INPUT = "v-VerdantPanel-noteInput";
const NOTES_INPUT_BOX = "v-VerdantPanel-noteInput-box";

export class RunNotes {
  node: HTMLElement;
  run: Run;

  constructor(run: Run) {
    this.run = run;
  }

  buildNotes(): HTMLElement {
    let noteBar = document.createElement("div");
    noteBar.classList.add(NOTES);

    let star = document.createElement("div");
    star.classList.add(STAR_BUTTON);
    star.addEventListener("click", this.star.bind(this, star));

    let inputBox = document.createElement("div");
    inputBox.classList.add(NOTES_INPUT_BOX);
    inputBox.addEventListener("mousedown", (ev: Event) => ev.stopPropagation());
    inputBox.addEventListener("mouseup", (ev: Event) => ev.stopPropagation());

    let input = document.createElement("textarea");
    input.spellcheck = true;
    input.placeholder = "make a note";
    input.classList.add(NOTE_INPUT);
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
    } else {
      starDiv.classList.add("highlight");
    }
  }

  updateNote(noteInput: HTMLTextAreaElement) {
    this.run.note = noteInput.value;
  }
}
