import { NodeHistory } from "./node-history";
import { NodeyOutput } from "../../nodey";
import { FileManager } from "../../jupyter-hooks/file-manager";
import * as nbformat from "@jupyterlab/nbformat";

/*
 * Goal is to store image or larger output externally in a folder without
 * the rest of the system needing to know that it's stored offsite
 */
/*
 * Note on nodey.raw:
 * Each output can have a list of different raw outputs. We'll need to handle them individually
 * in order to store images and charts externally.
 */

export class OutputHistory extends NodeHistory<NodeyOutput> {
  readonly fileManager: FileManager; // needed to read/write output files

  constructor(fileManager: FileManager) {
    super();
    this.fileManager = fileManager;
  }

  // send large/image output to external folder
  addVersion(nodey: NodeyOutput) {
    super.addVersion(nodey);
    let ver = nodey.version;
    let fixedRaw = nodey.raw.map((out, index) => {
      let imageTag = OutputHistory.isImage(out);
      if (imageTag) return this.sendImageToFile(ver, index, out, imageTag);
      return out;
    });
    this.versions[ver].raw = fixedRaw;
    return ver;
  }

  public static async isSame(
    A: NodeyOutput | nbformat.IOutput[] = [],
    B: NodeyOutput | nbformat.IOutput[] = [],
    fileManager: FileManager
  ) {
    let outList_a = A instanceof NodeyOutput ? A.raw : A;
    let outList_b = B instanceof NodeyOutput ? B.raw : B;

    // now check that they have the same number of outputs
    if (outList_a.length !== outList_b.length) return false;
    else {
      // helper function
      const asyncEvery = async (arr, predicate) => {
        for (let i = 0; i < arr.length; i++) {
          const e = arr[i];
          if (!(await predicate(e, i))) return false;
        }
        return true;
      };

      // now check that every output matches in a and b
      return await asyncEvery(outList_a, async (a, index) => {
        let b = outList_b[index];

        // Important! ignore the execution count, only compare
        // the data (or text) field of the output
        let raw_a = a.data ? a.data : a.text ? a.text : a;
        let raw_b = b.data ? b.data : b.text ? b.text : b;

        // if HTML format, get the raw text to compare
        if (raw_a && raw_a["text/plain"]) raw_a = raw_a["text/plain"];
        if (raw_b && raw_b["text/plain"]) raw_b = raw_b["text/plain"];

        // retrieve from storage if needed
        if (OutputHistory.isOffsite(a)) {
          a = await fileManager.getOutput(a);
          if (a) raw_a = a;
        }
        if (b instanceof NodeyOutput && OutputHistory.isOffsite(b)) {
          b = await fileManager.getOutput(b);
          if (b) raw_b = a;
        }

        // get image tags if images, assuming other metadata doesn't matter
        let image_a = OutputHistory.isImage(a);
        if (image_a && a?.data) raw_a = a.data[image_a] || raw_a;
        let image_b = OutputHistory.isImage(b);
        if (image_b && b?.data) raw_b = b.data[image_b] || raw_b;

        /*
         * TODO
         * images pulled from an offsite file have extra header data (?) which makes
         * their raw data larger and not match a fresh output. So we need special
         * tactics to compare images
         */

        // finally stringify data to compare it
        const str_a = JSON.stringify(raw_a);
        const str_b = JSON.stringify(raw_b);

        return str_a === str_b;
      });
    }
  }

  public static isImage(out): string | undefined {
    if (out.data) {
      let keys = Object.keys(out.data);
      return Array.from(keys).find((k) => k.includes("image"));
    }
  }

  public static isOffsite(output): output is OutputHistory.Offsite {
    return (
      (output as OutputHistory.Offsite).fileType !== undefined &&
      (output as OutputHistory.Offsite).offsite !== undefined
    );
  }

  // returns true if this output is only errors
  public static checkForAllErrors(output: nbformat.IOutput[]): boolean {
    if (output.length < 1) return false; // not anything here

    // must have at least 1 non-error
    let nonError = output?.find((out: nbformat.IOutput) => {
      // check for error type
      if (nbformat.isError(out)) return false;

      // check for warnings
      if (nbformat.isStream(out))
        return (out as nbformat.IStream)?.name !== "stderr";

      // not an error
      return true;
    });
    return nonError === undefined;
  }

  private sendImageToFile(
    ver: number,
    index: number,
    out,
    imageTag: string
  ): nbformat.IUnrecognizedOutput {
    let fileType = imageTag.split("/")[1]; // e.g. png
    let data = out.data[imageTag];
    let filename = `output_${this.versions[0].id}_${ver}_${index}.${fileType}`;
    this.fileManager.writeOutput(filename, data);
    return { output_type: "offsite image", offsite: filename, fileType };
  }
}

export namespace OutputHistory {
  export interface Offsite {
    offsite: string;
    fileType: string;
  }
}
