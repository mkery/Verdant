import {
  Nodey,
  NodeyMarkdown,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell
} from "../../lilgit/model/nodey";
import {History} from "../../lilgit/model/history";
import {Sampler} from "../../lilgit/model/sampler";
import {CELL_TYPE} from "../redux/ghost";

const INSPECT_VERSION = "v-VerdantPanel-sampler-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-sampler-version-content";
const RESULT_HEADER_BUTTON = "VerdantPanel-search-results-header-button";

export namespace VersionSampler {
  export enum SAMPLE_TYPE {
    DIFF,
    ARTIFACT,
    SEARCH
  }

  export async function sample(
    sampleType: SAMPLE_TYPE,
    history: History,
    nodey: Nodey,
    query?: string,
    diff?: number,
    prior?: string
  ) {
    let inspector = history.inspector;
    let text = inspector.renderNode(nodey);

    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    if (nodey instanceof NodeyCode)
      await buildCode(sampleType, inspector, nodey, text, content, prior, query, diff);
    else if (nodey instanceof NodeyMarkdown)
      await buildMarkdown(sampleType, inspector, nodey, text, content, prior, query, diff);
    else if (nodey instanceof NodeyOutput)
      await buildOutput(sampleType, inspector, nodey, content, query);

    return sample;
  }

  export function nameNodey(history: History, nodey: Nodey): string {
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

  async function buildCode(
    sampleType: SAMPLE_TYPE,
    inspector: Sampler,
    nodeyVer: NodeyCode,
    text: string,
    content: HTMLElement,
    prior: string,
    query?: string,
    diff?: number,
  ): Promise<HTMLElement> {
    content.classList.add("code");
    await inspector.renderCell(
      sampleType,
      nodeyVer,
      content,
      CELL_TYPE.CODE,
      diff,
      query,
      text,
      prior
    );

    return content;
  }

  async function buildOutput(
    sampleType: SAMPLE_TYPE,
    inspector: Sampler,
    nodeyVer: NodeyOutput,
    content: HTMLElement,
    query?: string
  ): Promise<HTMLElement> {
    await inspector.renderCell(
      sampleType,
      nodeyVer,
      content,
      CELL_TYPE.OUTPUT,
      Sampler.NO_DIFF,
      query
    );
    return content;
  }

  async function buildMarkdown(
    sampleType: SAMPLE_TYPE,
    inspector: Sampler,
    nodeyVer: NodeyMarkdown,
    text: string,
    content: HTMLElement,
    prior: string,
    query?: string,
    diff?: number,
  ): Promise<HTMLElement> {
    content.classList.add("markdown");
    content.classList.add("jp-RenderedHTMLCommon");
    await inspector.renderCell(
      sampleType,
      nodeyVer,
      content,
      CELL_TYPE.MARKDOWN,
      diff,
      query,
      text,
      prior
    );

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
