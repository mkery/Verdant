import { Nodey } from "../nodey";
import { Sampler } from "./sampler";

const SEARCH_FILTER_RESULTS = "v-VerdantPanel-sample-searchResult";

export class Search {
  private readonly sampler;

  constructor(sampler: Sampler) {
    this.sampler = sampler;
  }

  public async renderSearchCell(nodey: Nodey, query?: string) {
    let [sample, elem] = this.sampler.makeSampleDivs(nodey);

    await this.sampler.renderArtifactCell(nodey, elem);

    if (query) {
      elem = this.highlightText(query, elem);
    }
    return sample;
  }

  // Helper method for search cells

  private highlightText(textFocus: string, elem: HTMLElement) {
    let words = textFocus.split(" ");
    let elemHTML = elem.outerHTML;

    words.forEach((w) => {
      elemHTML = this.highlightWord(w, elemHTML);
    });
    elem.outerHTML = elemHTML;
    return elem;
  }

  private highlightWord(textFocus: string, text: string) {
    /* Highlight text in an HTML element */

    let textFocus_safe = this.escapeRegex(textFocus);
    let word = new RegExp(textFocus_safe, "i");
    let regex = new RegExp(">[^<]*" + textFocus_safe + "[^>]*<", "gi");
    //console.log("TEST", regex.exec(text));
    let match;
    let newText = text;
    let step = 0;
    while ((match = regex.exec(text)) != null) {
      let index = match.index + step;
      //console.log("MATCH", match, index);
      let substring = (match[0] as string).slice(1, match[0].length - 1);
      substring = substring.replace(
        word,
        `<span class="${SEARCH_FILTER_RESULTS}">${textFocus}</span>`
      );
      newText =
        newText.slice(0, index + 1) +
        substring +
        newText.slice(index + match[0].length - 1);
      step = newText.length - text.length;
    }

    return newText; // finally return element html
  }

  private escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }
}
