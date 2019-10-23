import { Widget } from "@phosphor/widgets";
import { VersionSampler } from "../../sampler/version-sampler";
import { Nodey } from "../../../lilgit/model/nodey";

const FILTER_BUTTON = "v-VerdantPanel-filter-box-icon";
const FILTER_TAG_BIN = "v-VerdantPanel-filter-tag-bin";
const FILTER_TAG = "v-VerdantPanel-filter-tag";
const FILTER_ICON = "v-VerdantPanel-filterButton";

export class FilterBox extends Widget {
  readonly filterTagBin: HTMLElement;
  readonly filters: { [name: string]: (n: Nodey) => boolean };

  constructor(
    filters: { [name: string]: (n: Nodey) => boolean },
    updateSearch: () => void
  ) {
    super();
    this.filters = filters;
    this.node.classList.add(FILTER_BUTTON);
    let icon = document.createElement("div");
    icon.classList.add(FILTER_ICON);
    this.node.appendChild(icon);

    this.filterTagBin = document.createElement("div");
    this.filterTagBin.classList.add(FILTER_TAG_BIN);

    for (var name in filters) {
      let filterTag = document.createElement("div");
      filterTag.classList.add(FILTER_TAG);
      filterTag.classList.add("disabled");
      filterTag.textContent = name;
      filterTag.addEventListener("click", () => {
        if (filterTag.classList.contains("disabled"))
          filterTag.classList.remove("disabled");
        else filterTag.classList.add("disabled");
        updateSearch();
      });
      this.filterTagBin.appendChild(filterTag);
    }

    let onOpen = () => {
      let tags = this.filterTagBin.getElementsByClassName("disabled");
      for (var i = 0; i < tags.length; i++) {
        (tags[i] as HTMLElement).style.display = "";
      }
    };
    let onClose = () => {
      let tags = this.filterTagBin.getElementsByClassName("disabled");
      for (var i = 0; i < tags.length; i++) {
        (tags[i] as HTMLElement).style.display = "none";
      }
    };
    VersionSampler.addCaret(this.node, null, true, onOpen, onClose);
  }

  getActiveFilters(): ((n: Nodey) => boolean)[] {
    let active = [];
    let tags = this.filterTagBin.getElementsByClassName(FILTER_TAG);
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].classList.contains("disabled")) continue;
      else active.push(this.filters[tags[i].textContent]);
    }
    return active;
  }
}
