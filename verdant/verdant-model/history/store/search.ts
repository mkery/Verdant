import { Nodey, NodeyCode, NodeyOutput, NodeyMarkdown } from "../../nodey";
import { NodeHistory, OutputHistory, CodeHistory, searchResult } from ".";
import { Sampler } from "../../sampler";

const VISUAL_KEYWORDS = [
  "plot",
  "hist",
  "chart",
  "histogram",
  "image",
  "matplotlib",
  "graphs",
  "diagram",
  "map",
];

const EMPTY_CODE = {
  label: "code cell",
  count: 0,
  results: [] as NodeyCode[][],
};
const EMPTY_MARKDOWN = {
  label: "markdown cell",
  count: 0,
  results: [] as NodeyMarkdown[][],
};
const EMPTY_OUTPUT = {
  label: "output",
  count: 0,
  results: [] as NodeyOutput[][],
};

export namespace Search {
  export function search(
    query: string,
    sampler: Sampler,
    _markdownStore: NodeHistory<NodeyMarkdown>[],
    _codeCellStore: CodeHistory[],
    _outputStore: OutputHistory[]
  ): searchResult[] {
    let markdown_results, code_results, output_results;

    if (query?.startsWith("=")) {
      // exact artifact search
      const name = formatName(query);
      console.log("ARTIFACT SEARCH FOR ", query, name);
      markdown_results = findArtifactMarkdown(name, _markdownStore);
      code_results = findArtifactCode(name, _codeCellStore);
      output_results = findArtifactOutput(name, _outputStore);
    } else {
      // keyword search
      markdown_results = findMarkdown(query, _markdownStore);
      code_results = findCode(query, _codeCellStore, sampler);
      output_results = findOutput(query, _outputStore, sampler);

      return [code_results, markdown_results, output_results];
    }

    return [code_results, markdown_results, output_results];
  }

  function formatName(query: string): [string, number, number] {
    let name = query.substring(1)?.toLowerCase();
    let typeChar: string;
    let id: number;
    let ver: number;

    if (name.startsWith("out")) {
      /*
       * output image file formatted as output_10_27_0
       * `output_${this.versions[0].id}_${ver}_${index}.${fileType}`
       */
      typeChar = NodeyOutput.typeChar;
      const dot_split = name.split(".");
      const _split = dot_split[0]?.split("_");
      id = parseInt(_split[1]);
      ver = parseInt(_split[2]);
    } else {
      /*
       * assume normal formatted name
       * typeChar + "." + id + "." + version
       */
      const dot_split = name.split(".");
      typeChar = fixTypeChar(dot_split[0]);
      id = parseInt(dot_split[1]);
      ver = parseInt(dot_split[2]);
    }

    return [typeChar, id, ver];
  }

  function fixTypeChar(typeChar: string): string {
    if (typeChar === NodeyCode.typeChar || typeChar === "code") {
      return NodeyCode.typeChar;
    } else if (typeChar === NodeyMarkdown.typeChar || typeChar === "markdown") {
      return NodeyMarkdown.typeChar;
    } else if (
      typeChar === NodeyOutput.typeChar ||
      ["o", "out", "output"].includes(typeChar)
    ) {
      return NodeyOutput.typeChar;
    }
  }

  function findAllOfType(store: NodeHistory<Nodey>[], result: searchResult) {
    store.forEach((history) => {
      let all = history.getAllVersions();
      if (all.length > 0) {
        result.count += all?.length;
        result.results.push(all);
      }
    });
  }

  function findArtifact(
    id: number,
    ver: number,
    store: NodeHistory<Nodey>[],
    result_acc: searchResult
  ) {
    result_acc.count = 0;
    result_acc.results = [];
    let history = store[id];
    if (history) {
      // get specific markdown
      let nodey = history.getVersion(ver);
      if (nodey) {
        // get the single markdown with this ID & version
        result_acc.count = 1;
        result_acc.results.push([nodey]);
      } else {
        // get all markdown with this ID
        let all = history.getAllVersions();
        if (all.length > 0) {
          result_acc.count = all.length;
          result_acc.results.push(all);
        }
      }
    } else {
      // get all markdown
      findAllOfType(store, result_acc);
    }
  }

  function findArtifactMarkdown(
    name: [string, number, number],
    _markdownStore: NodeHistory<NodeyMarkdown>[]
  ): searchResult {
    let [typeChar, id, ver] = name;
    let result_acc = { ...EMPTY_MARKDOWN };
    if (typeChar === NodeyMarkdown.typeChar) {
      findArtifact(id, ver, _markdownStore, result_acc);
    }
    return result_acc;
  }

  /*
   * Returns a list of Markdown artifacts, each with a list
   * of all the versions of that artifact that match the query
   */
  function findMarkdown(
    query: string,
    _markdownStore: NodeHistory<NodeyMarkdown>[]
  ): searchResult {
    let result_acc = { ...EMPTY_MARKDOWN };

    let results: NodeyMarkdown[][] = [];
    let resultCount = 0;
    let text = query.toLowerCase().split(" ");
    _markdownStore.forEach((history) => {
      let match = history.filter((item) => {
        if (!item.markdown) return false;
        let matchesText = text.some(
          (keyword) => item.markdown.toLowerCase().indexOf(keyword) > -1
        );
        return matchesText;
      });
      if (match.length > 0) {
        results.push(match);
        resultCount += match.length;
      }
    });

    result_acc.results = results;
    result_acc.count += resultCount;
    return result_acc;
  }

  function findArtifactCode(
    name: [string, number, number],
    _codeCellStore: CodeHistory[]
  ): searchResult {
    let [typeChar, id, ver] = name;
    let result_acc = { ...EMPTY_CODE };
    if (typeChar === NodeyCode.typeChar) {
      findArtifact(id, ver, _codeCellStore, result_acc);
    }
    return result_acc;
  }

  /*
   * Returns a list of code artifacts, each with a list
   * of all the versions of that artifact that match the query
   */
  function findCode(
    query: string,
    _codeCellStore: CodeHistory[],
    sampler: Sampler
  ): searchResult {
    let result_acc = { ...EMPTY_CODE };

    let results: NodeyCode[][] = [];
    let resultCount = 0;
    let text = query.toLowerCase().split(" ");
    _codeCellStore.forEach((history) => {
      let matches = history.filter((cell) => {
        let sourceText = sampler.nodeToText(cell) || "";
        if (
          text.some((keyword) => sourceText.toLowerCase().indexOf(keyword) > -1)
        ) {
          return true;
        }
        return false;
      });
      if (matches.length > 0) {
        results.push(matches);
        resultCount += matches.length;
      }
    });

    result_acc.results = results;
    result_acc.count += resultCount;
    return result_acc;
  }

  function findArtifactOutput(
    name: [string, number, number],
    _outputStore: OutputHistory[]
  ): searchResult {
    let [typeChar, id, ver] = name;
    let result_acc = { ...EMPTY_OUTPUT };
    if (typeChar === NodeyOutput.typeChar) {
      findArtifact(id, ver, _outputStore, result_acc);
    }
    return result_acc;
  }

  /*
   * Returns a list of output artifacts, each with a list
   * of all the versions of that artifact that match the query
   */
  function findOutput(
    query: string,
    _outputStore: OutputHistory[],
    sampler: Sampler
  ): searchResult {
    let result_acc = { ...EMPTY_OUTPUT };

    let results: NodeyOutput[][] = [];
    let resultCount = 0;
    let text = query.toLowerCase().split(" ");
    const FIND_IMAGES = text.some((word) => VISUAL_KEYWORDS.includes(word))
      ? true
      : false;
    _outputStore.forEach((history) => {
      let matches = history.filter((output) => {
        // search for (any) image
        if (FIND_IMAGES) {
          const isImage = output?.raw?.some((out) =>
            OutputHistory.isOffsite(out)
          );
          if (isImage) return true;
        }

        // search text
        let sourceText = sampler.nodeToText(output) || "";
        return text.some(
          (keyword) => sourceText.toLowerCase().indexOf(keyword) > -1
        );
      });
      if (matches.length > 0) {
        results.push(matches);
        resultCount += matches.length;
      }
    });

    result_acc.results = results;
    result_acc.count += resultCount;
    return result_acc;
  }
}
