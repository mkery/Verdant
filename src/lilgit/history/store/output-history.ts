import { NodeHistory } from "./node-history";
import { NodeyOutput } from "../../nodey";
import { FileManager } from "../../jupyter-hooks/file-manager";

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
    let ver = super.addVersion(nodey);
    let fixedRaw = nodey.raw.map((out, index) => {
      let imageTag = findImageTag(out);
      if (imageTag) console.log("ITS AN IMAGE");
      else console.log("NOT AN IMAGE");
      if (imageTag) return this.sendImageToFile(ver, index, out, imageTag);
      return out;
    });
    this.versions[ver - 1].raw = fixedRaw;
    return ver;
  }

  sendImageToFile(
    ver: number,
    index: number,
    out,
    imageTag: string
  ): OutputHistory.Offsite {
    let fileType = imageTag.split("/")[1]; // e.g. png
    let data = out.data[imageTag];
    let filename = `output_${this.versions[0].id}_${ver}_${index}.${fileType}`;
    this.fileManager.writeOutput(filename, data);
    return { offsite: filename, fileType };
  }
}

export namespace OutputHistory {
  export interface Offsite {
    offsite: string;
    fileType: string;
  }
}

/* Helper functions for identifying output kind */

function findImageTag(out): string {
  if (out.data) {
    let keys = Object.keys(out.data);
    return Array.from(keys).find((k) => k.includes("image"));
  }
}
