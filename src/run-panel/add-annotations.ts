import { HistoryModel } from "../model/history";

const NOTES = "v-VerdantPanel-noteContainer";
const STAR_BUTTON = "v-VerdantPanel-starButton";
const NOTE_ICON = "v-VerdantPanel-noteIcon";
const NOTE_INPUT = "v-VerdantPanel-noteInput";

export namespace Annotator {
  export function buildTextArea(
    run: any,
    historyModel: HistoryModel
  ): HTMLElement {
    let input = document.createElement("textarea");
    input.addEventListener("keyup", () => {
      input.style.height = "1em";
      input.style.height = input.scrollHeight + "px";
    });
    input.spellcheck = true;
    input.placeholder = "make a note";
    input.classList.add(NOTE_INPUT);
    if (run.note > -1) input.value = historyModel.getNote(run.note).text;
    input.addEventListener(
      "input",
      updateNote.bind(this, input, run, historyModel)
    );
    input.addEventListener(
      "keypress",
      updateNote.bind(this, input, run, historyModel)
    );
    return input;
  }

  export function buildHeaderNotes(
    run: any,
    historyModel: HistoryModel
  ): HTMLElement {
    let noteBar = document.createElement("div");
    noteBar.classList.add(NOTES);

    let commentIcon = document.createElement("div");
    commentIcon.classList.add(NOTE_ICON);
    commentIcon.classList.add("header");

    let inputBox = buildTextArea(run, historyModel);
    inputBox.spellcheck = false;
    noteBar.appendChild(commentIcon);
    noteBar.appendChild(inputBox);
    return noteBar;
  }

  export function buildDetailNotes(
    run: any,
    historyModel: HistoryModel
  ): HTMLElement {
    let noteBar = document.createElement("div");
    noteBar.classList.add(NOTES);

    let star = document.createElement("div");
    star.classList.add(STAR_BUTTON);
    if (run.star > -1) star.classList.add("highlight");
    star.addEventListener(
      "click",
      Annotator.star.bind(this, star, run, historyModel)
    );

    let commentIcon = document.createElement("div");
    commentIcon.classList.add(NOTE_ICON);

    let inputBox = buildTextArea(run, historyModel);
    noteBar.appendChild(star);
    noteBar.appendChild(commentIcon);
    noteBar.appendChild(inputBox);
    return noteBar;
  }

  export function star(
    starDiv: HTMLElement,
    run: any,
    historyModel: HistoryModel
  ) {
    if (starDiv.classList.contains("active")) {
      starDiv.classList.remove("active");
      historyModel.deRegisterStar(run.star);
      run.star = -1;
    } else {
      starDiv.classList.add("active");
      let star = historyModel.registerStar(run);
      run.star = star.id;
    }
  }

  export function updateNote(
    noteInput: HTMLTextAreaElement,
    run: any,
    historyModel: HistoryModel
  ) {
    if (run.note === -1) {
      let note = historyModel.registerNote(noteInput.value, run);
      run.note = note.id;
    }
    historyModel.getNote(run.note).text = noteInput.value;
  }
}
