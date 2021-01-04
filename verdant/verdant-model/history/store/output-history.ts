import { NodeHistory } from "./node-history";
import { NodeyOutput } from "../../nodey";
import { FileManager } from "../../jupyter-hooks/file-manager";
import { IOutput, IUnrecognizedOutput } from "@jupyterlab/nbformat";

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
    A: NodeyOutput | IOutput[] = [],
    B: NodeyOutput | IOutput[] = [],
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
        // the data field of the output
        let raw_a = JSON.stringify(a.data);
        let raw_b = JSON.stringify(b.data);

        // retrieve from storage if needed
        if (OutputHistory.isOffsite(a)) {
          a = await fileManager.getOutput(a);
          if (a) raw_a = JSON.stringify(a);
        }
        if (b instanceof NodeyOutput && OutputHistory.isOffsite(b)) {
          b = await fileManager.getOutput(b);
          if (b) raw_b = JSON.stringify(b);
        }

        // get image tags if images, assuming other metadata doesn't matter
        let image_a = OutputHistory.isImage(a);
        if (image_a && a?.data) raw_a = a.data[image_a] || raw_a;
        let image_b = OutputHistory.isImage(b);
        if (image_b && b?.data) raw_b = b.data[image_b] || raw_b;

        return raw_a === raw_b;
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

  private sendImageToFile(
    ver: number,
    index: number,
    out,
    imageTag: string
  ): IUnrecognizedOutput {
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
