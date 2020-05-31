import * as React from "react";
import { Nodey } from "../../lilgit/model/nodey";
import { History } from "../../lilgit/model/history";
import { VersionSampler } from "./version-sampler";

const VERSION_HEADER = "v-VerdantPanel-sampler-version-header";
const VERSION_LINK = "v-VerdantPanel-sampler-version-header-link";

type VersionHeader_Props = {
  history: History;
  nodey: Nodey;
  notebookLink: (ver: number) => void;
};

export default class VersionHeader extends React.Component<
  VersionHeader_Props
> {
  render() {
    // 1 index instead of 0 index just for display
    let ver = this.props.nodey.version + 1;
    let notebookVer; // first notebook this version appears in
    if (this.props.nodey.created) {
      let created = this.props.history.checkpoints.get(
        this.props.nodey.created
      );
      notebookVer = created.notebook + 1;
    } else {
      // older log format
      try {
        let cell = this.props.history.store.getCellParent(this.props.nodey);
        let notebook = cell.parent.split(".");
        notebookVer = parseInt(notebook[2]) + 1;
      } catch (error) {
        console.error("Notebook not found for nodey: ", error);
      }
    }

    let nodeLabel =
      "v" +
      ver +
      " " +
      VersionSampler.nameNodey(this.props.history, this.props.nodey) +
      ", ";

    return (
      <div className={VERSION_HEADER}>
        <span>{nodeLabel}</span>
        <span
          className={VERSION_LINK}
          onClick={() => {
            if (notebookVer !== undefined) this.props.notebookLink(notebookVer);
          }}
        >
          {`NOTEBOOK #${notebookVer ? notebookVer : "???"}`}
        </span>
      </div>
    );
  }
}
