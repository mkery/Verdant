import { Nodey } from "../../lilgit/nodey";
import { History } from "../../lilgit/history";
import { SAMPLE_TYPE } from "../../lilgit/sampler";

const INSPECT_VERSION = "v-VerdantPanel-sampler-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-sampler-version-content";

export namespace VersionSampler {
  export async function sample(
    sampleType: SAMPLE_TYPE,
    history?: History,
    nodey?: Nodey,
    query?: string | null,
    diff?: number
  ) {
    // annoying type conversion
    if (query === null) query = undefined;

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

      let inspector = history.inspector;
      let text = inspector.renderNode(nodey);
      switch (sampleType) {
        case SAMPLE_TYPE.ARTIFACT:
          await inspector.renderArtifactCell(nodey, content, text);
          break;
        case SAMPLE_TYPE.SEARCH:
          await inspector.search.renderSearchCell(nodey, content, query, text);
          break;
        case SAMPLE_TYPE.DIFF:
          await inspector.renderDiff(nodey, content, diff, text);
          break;
      }
    }
    return sample;
  }
}
