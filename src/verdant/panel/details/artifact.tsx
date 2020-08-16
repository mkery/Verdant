import * as React from "react";
import { Nodey, NodeyCode, NodeyOutput } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import { verdantState } from "../../redux/index";
import { connect } from "react-redux";
import VersionDetail from "./version-detail";
import VersionPair from "./version-pair";

export type Artifact_Props = {
  history: History;
  nodey: Nodey;
  nodey_versions: Nodey[] | Nodey[][];
  nodey_dependents: Nodey[] | Nodey[][];
};

class Artifact extends React.Component<Artifact_Props> {
  render() {
    let elems: JSX.Element[] = [];

    // show a single column simple artifact without dependencies
    if (!this.props.nodey_dependents) {
      for (let i = this.props.nodey_versions.length - 1; i > -1; i--) {
        elems.push(
          <VersionDetail
            key={i}
            nodey={this.props.nodey_versions[i] as Nodey}
          />
        );
      }
    }

    // show two column artifact with a dependency pair
    else {
      for (let i = this.props.nodey_versions.length - 1; i > -1; i--) {
        // some artifact versions may not have dependency (e.g. code w/o output)
        if (
          Array.isArray(this.props.nodey_dependents[i]) &&
          (this.props.nodey_dependents[i] as Nodey[]).length < 1
        ) {
          elems.push(
            <VersionDetail
              key={i}
              nodey={this.props.nodey_versions[i] as Nodey}
            />
          );
        } else {
          elems.push(
            <VersionPair
              key={i}
              nodey={this.props.nodey_versions[i]}
              dependent={this.props.nodey_dependents[i]}
            />
          );
        }
      }
    }

    return <div className="v-VerdantPanel-details-artifact">{elems}</div>;
  }
}

function calculateVersionMapping(nodey: Nodey, history: History) {
  let nodey_versions;
  let nodey_dependents;

  // one to many mapping between code and output
  if (nodey instanceof NodeyCode) {
    let hist = history.store.getHistoryOf(nodey);
    nodey_versions = hist.getAllVersions();
    nodey_dependents = nodey_versions.map((ver) => {
      let outHist = history.store.getOutput(ver);
      if (outHist) return outHist.getAllVersions();
      else return [];
    });
  }
  // many to one mapping between output and code
  else if (nodey instanceof NodeyOutput) {
    let cellParent = history.store.getCellParent(nodey);
    let allOutput = history.store.getAllOutput(cellParent);
    nodey_versions = allOutput.map((hist) => hist.getAllVersions());
    nodey_dependents = allOutput.map((hist) => {
      let out = hist.latest;
      // return the code cell parent, which should be the same for every output
      // in this output history
      return history.store.get(out.parent);
    });
  }
  // otherwise (for now) assume no dependents with markdown or raw cells
  else {
    let hist = history.store.getHistoryOf(nodey);
    nodey_versions = hist.getAllVersions();
  }

  return [nodey_versions, nodey_dependents];
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<Artifact_Props>
) => {
  let history = state.getHistory();
  let [nodey_versions, nodey_dependents] = calculateVersionMapping(
    ownProps.nodey,
    history
  );

  return {
    history,
    nodey_versions,
    nodey_dependents,
  };
};

export default connect(mapStateToProps, null)(Artifact);
