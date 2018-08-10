import { Widget } from "@phosphor/widgets";

const FILTER_BAR = "v-Verdant-GhostBook-filterBar";
const FILTER_BUTTON = "v-Verdant-GhostBook-filterButton";
const FILTER_TRAY = "v-Verdant-GhostBook-filterTray";
const FILTER = "v-Verdant-GhostBook-filter";
export class FilterTray extends Widget {
  constructor() {
    super();
    this.addClass(FILTER_BAR);

    let filterButton = document.createElement("div");
    filterButton.classList.add(FILTER_BUTTON);
    filterButton.classList.add("open");
    this.node.appendChild(filterButton);
    filterButton.addEventListener("click", this.toggleFilterTray.bind(this));

    let filterTray = document.createElement("div");
    filterTray.classList.add(FILTER_TRAY);

    let markdown = document.createElement("div");
    markdown.classList.add(FILTER);
    markdown.classList.add("active");
    markdown.textContent = "markdown";
    filterTray.appendChild(markdown);
    markdown.addEventListener("click", this.toggleFilter.bind(this, markdown));

    let code = document.createElement("div");
    code.classList.add(FILTER);
    code.classList.add("active");
    code.textContent = "code";
    filterTray.appendChild(code);
    code.addEventListener("click", this.toggleFilter.bind(this, code));

    let output = document.createElement("div");
    output.classList.add(FILTER);
    output.classList.add("active");
    output.textContent = "text output";
    filterTray.appendChild(output);
    output.addEventListener("click", this.toggleFilter.bind(this, output));

    let table = document.createElement("div");
    table.classList.add(FILTER);
    table.classList.add("active");
    table.textContent = "table output";
    filterTray.appendChild(table);
    table.addEventListener("click", this.toggleFilter.bind(this, table));

    let image = document.createElement("div");
    image.classList.add(FILTER);
    image.classList.add("active");
    image.textContent = "image & plot output";
    filterTray.appendChild(image);
    image.addEventListener("click", this.toggleFilter.bind(this, image));

    this.node.appendChild(filterTray);
  }

  get filterTray() {
    return this.node.getElementsByClassName(FILTER_TRAY)[0] as HTMLElement;
  }

  get filterButton() {
    return this.node.getElementsByClassName(FILTER_BUTTON)[0] as HTMLElement;
  }

  get filterLabels(): HTMLElement[] {
    return Array.prototype.slice.call(this.node.getElementsByClassName(FILTER));
  }

  private toggleFilter(button: HTMLElement) {
    if (button.classList.contains("active")) {
      button.classList.remove("active");
      this.filterButton.classList.add("active");
    } else {
      button.classList.add("active");
      let allButtons = this.filterLabels;
      if (allButtons.every(item => item.classList.contains("active")))
        this.filterButton.classList.remove("active");
      else this.filterButton.classList.add("active");
    }
  }

  private toggleFilterTray() {
    let tray = this.filterTray;
    if (tray.offsetParent === null) {
      tray.style.display = "";
      this.filterButton.classList.add("open");
    } else {
      tray.style.display = "none";
      this.filterButton.classList.remove("open");
    }
  }
}
