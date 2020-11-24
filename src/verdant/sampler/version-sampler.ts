import { Nodey } from "../../lilgit/nodey";
import { History } from "../../lilgit/history";

const INSPECT_VERSION = "v-VerdantPanel-sampler-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-sampler-version-content";

export namespace VersionSampler {
  export async function sample(
    history?: History,
    nodey?: Nodey,
    query?: string | null
  ) {
    // annoying type conversion
    if (query === null) query = undefined;

    let [sample, content] = makeSampleDivs(nodey);

    if (nodey && history && query) {
      await history.inspector.search.renderSearchCell(nodey, content, query);
    } else await history.inspector.renderArtifactCell(nodey, content);

    return sample;
  }

  export async function sampleDiff(
    history?: History,
    nodey?: Nodey,
    diff?: number,
    relativeToNotebook?: number
  ) {
    let [sample, content] = makeSampleDivs(nodey);
    if (nodey && history)
      await history.inspector.renderDiff(
        nodey,
        content,
        diff,
        relativeToNotebook
      );
    return sample;
  }

  function makeSampleDivs(nodey: Nodey) {
    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    // check we have valid input
    if (nodey && history) {
      if (nodey.typeChar === "c") {
        content.classList.add("code");
        sample.classList.add("code");
      } else if (nodey.typeChar === "m") {
        content.classList.add("markdown");
        content.classList.add("jp-RenderedHTMLCommon");
      } else {
        content.classList.add("output");
      }
    }
    return [sample, content];
  }
}
