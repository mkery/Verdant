import {
  Nodey,
  NodeyMarkdown,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell
} from "../../lilgit/model/nodey";
import { History } from "../../lilgit/model/history";
import { Sampler } from "../../lilgit/model/sampler";

const INSPECT_VERSION = "v-VerdantPanel-sampler-version";
const SEARCH_SAMPLE = "v-VerdantPanel-search-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-sampler-version-content";
const VERSION_HEADER = "v-VerdantPanel-sampler-version-header";
const SEARCH_VERSION_LABEL = "v-VerdantPanel-search-version-header";
const VERSION_LINK = "v-VerdantPanel-sampler-version-header-link";
const RESULT_HEADER_BUTTON = "VerdantPanel-search-results-header-button";

export namespace VersionSampler {
  export function sample(
    history: History,
    nodey: Nodey,
    query?: string,
    diff?: number
  ) {
    let inspector = history.inspector;
    let text = inspector.renderNode(nodey);

    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    if (nodey instanceof NodeyCode)
      buildCode(inspector, nodey, text, content, query, diff);
    else if (nodey instanceof NodeyMarkdown)
      buildMarkdown(inspector, nodey, text, content, query, diff);
    else if (nodey instanceof NodeyOutput)
      buildOutput(inspector, nodey, content, query);

    return sample;
  }

  export function sampleSearch(
    history: History,
    nodey: Nodey[],
    query: string,
    callback: () => void,
    notebookLink: (ver: number) => void
  ): HTMLElement {
    let container = document.createElement("div");
    let versions = document.createElement("div");
    let header = document.createElement("div");
    container.appendChild(header);
    container.appendChild(versions);
    header.appendChild(searchHeader(history, nodey, versions, callback));

    nodey.forEach(item => {
      let wrapper = document.createElement("div");
      let div = sample(history, item, query);
      div.classList.add(SEARCH_SAMPLE);
      let header = verHeader(history, item, notebookLink);
      header.classList.add("searchVerLabel");
      wrapper.appendChild(header);
      wrapper.appendChild(div);
      versions.appendChild(wrapper);
    });
    return container;
  }

  function searchHeader(
    history: History,
    nodey: Nodey[],
    content: HTMLElement,
    callback: () => void
  ) {
    let label = document.createElement("div");
    label.classList.add(VERSION_HEADER);
    label.classList.add("search");
    let spanA = document.createElement("span");
    spanA.textContent = nodey.length + " versions of ";
    let spanB = document.createElement("span");
    spanB.textContent = nameNodey(history, nodey[0]);
    spanB.classList.add(VERSION_LINK);
    spanB.addEventListener("mousedown", callback);
    let textLabel = document.createElement("div");
    textLabel.classList.add(SEARCH_VERSION_LABEL);
    textLabel.appendChild(spanA);
    textLabel.appendChild(spanB);

    addCaret(label, content, true);
    label.appendChild(textLabel);
    return label;
  }

  function nameNodey(history: History, nodey: Nodey): string {
    let nodeyName: string;
    if (nodey instanceof NodeyMarkdown) nodeyName = "markdown " + nodey.id;
    else if (nodey instanceof NodeyCodeCell)
      nodeyName = "code cell " + nodey.id;
    else if (nodey instanceof NodeyOutput) nodeyName = "output " + nodey.id;
    else if (nodey instanceof NodeyCode) {
      let cell = history.store.getCellParent(nodey);
      nodeyName =
        nodey.type + " " + nodey.id + " from " + nameNodey(history, cell);
    }
    return nodeyName;
  }

  export function verHeader(
    history: History,
    nodey: Nodey,
    notebookLink: (ver: number) => void
  ) {
    // 1 index instead of 0 index just for display
    let ver = nodey.version + 1;
    let created = history.checkpoints.get(nodey.created);
    let notebookVer;
    if (created) notebookVer = created.notebook + 1 + "";
    else notebookVer = "???";

    let header = document.createElement("div");
    header.classList.add(VERSION_HEADER);

    let nodeLabel = document.createElement("span");
    nodeLabel.textContent = "v" + ver + " " + nameNodey(history, nodey) + ", ";
    let notebookLabel = document.createElement("span");
    notebookLabel.classList.add(VERSION_LINK);
    if (created && created.notebook)
      notebookLabel.addEventListener("click", () =>
        notebookLink(created.notebook)
      );
    notebookLabel.textContent = "NOTEBOOK #" + notebookVer;

    header.appendChild(nodeLabel);
    header.appendChild(notebookLabel);
    return header;
  }

  async function buildCode(
    inspector: Sampler,
    nodeyVer: NodeyCode,
    text: string,
    content: HTMLElement,
    query?: string,
    diff?: number
  ): Promise<HTMLElement> {
    if (diff === undefined) diff = Sampler.CHANGE_DIFF;
    content.classList.add("code");
    await inspector.renderDiff(nodeyVer, content, {
      newText: text,
      diffKind: diff,
      textFocus: query
    });

    return content;
  }

  async function buildOutput(
    inspector: Sampler,
    nodeyVer: NodeyOutput,
    content: HTMLElement,
    query?: string
  ): Promise<HTMLElement> {
    await inspector.renderDiff(nodeyVer, content, { textFocus: query });
    return content;
  }

  async function buildMarkdown(
    inspector: Sampler,
    nodeyVer: NodeyMarkdown,
    text: string,
    content: HTMLElement,
    query?: string,
    diff?: number
  ): Promise<HTMLElement> {
    if (diff === undefined) diff = Sampler.CHANGE_DIFF;
    content.classList.add("markdown");
    await inspector.renderDiff(nodeyVer, content, {
      newText: text,
      diffKind: diff,
      textFocus: query
    });

    return content;
  }

  /*
  * animated button, thus the extra divs
  */
  export function addCaret(
    label: HTMLElement,
    content: HTMLElement,
    opened?: boolean,
    onOpen?: () => void,
    onClose?: () => void
  ) {
    let button = document.createElement("div");
    button.classList.add(RESULT_HEADER_BUTTON);
    if (opened) button.classList.add("opened");
    else button.classList.add("closed");
    label.appendChild(button);
    let circle = document.createElement("div");
    circle.classList.add("circle");
    button.appendChild(circle);
    let horizontal = document.createElement("div");
    horizontal.classList.add("horizontal");
    circle.appendChild(horizontal);
    let vertical = document.createElement("div");
    vertical.classList.add("vertical");
    circle.appendChild(vertical);
    label.addEventListener("mousedown", () => {
      if (button.classList.contains("opened")) {
        button.classList.remove("opened");
        button.classList.add("closed");
        setTimeout(() => {
          if (onClose) onClose();
          if (content) content.style.display = "none";
        }, 100);
      } else if (button.classList.contains("closed")) {
        button.classList.remove("closed");
        button.classList.add("opened");
        setTimeout(() => {
          if (onOpen) onOpen();
          if (content) content.style.display = "block";
        }, 300);
      }
    });
  }
}
