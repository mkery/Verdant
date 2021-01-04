import * as React from "react";
import InspectorButton from "../inspector-button";
import { History } from "../../../verdant-model/history";
import CrumbMenu from "./crumbMenu";
import Artifact from "./artifact";
import ArtifactOrigin from "./artifact-origin";
import { Nodey, NodeyCode } from "../../../verdant-model/nodey";
import { verdantState, showDetailOfNode } from "../../redux";
import { connect } from "react-redux";

export type Details_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  target: Nodey | null;
  origins: Nodey[];
};

class ArtifactDetails extends React.Component<Details_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-content">
        <div className="v-VerdantPanel-tab-header">
          <CrumbMenu />
          {this.showOutputLink()}
        </div>
        <div className="v-VerdantPanel-content">
          {this.props.target ? <Artifact nodey={this.props.target} /> : null}
          {this.showOrigins()}
        </div>
        <InspectorButton />
      </div>
    );
  }

  showOutputLink() {
    if (this.props.target && this.props.target instanceof NodeyCode) {
      let out = this.props.history.store.getAllOutput(this.props.target);
      if (out && out.length > 0) {
        return (
          <span
            className="v-VerdantPanel-tab-header-outLink verdant-link"
            onClick={() =>
              out[0].latest ? this.props.showDetails(out[0].latest) : null
            } //TODO!
          >
            show all output
          </span>
        );
      }
    }
    return null;
  }

  showOrigins() {
    if (this.props.target) {
      let prior: Nodey = this.props.target;
      return this.props.origins.map((nodey, i) => {
        let origin = <ArtifactOrigin key={i} derived={prior} nodey={nodey} />;
        prior = nodey;
        return origin;
      });
    }
    return null;
  }

  // version pair <Version Singleton > < Version List >
  // version pair <Version Singleton > (closed right side)
  // version pair <Version List > (closed right side)
  // version pair <Version Singleton > (has no right side)
  /*
   * steps: 1) figure out what L side and R side are
   * 2) version pair instantiates L and R as Version Singletons or Version List
   * 3) version pair manages the open/closed state of L side and R side
   */
}

function findOrigins(nodey: Nodey, history: History): Nodey[] {
  let origins: Nodey[] = [];

  let versions = history.store.getHistoryOf(nodey);
  while (versions && versions.originPointer) {
    let o = history.store.get(versions.originPointer.origin);
    if (o) {
      origins.push(o);
    }
    versions = history.store.getHistoryOf(o);
  }

  return origins;
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(showDetailOfNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  let history = state.getHistory();
  let target = state.artifactView.inspectTarget;
  let origins = target ? findOrigins(target, history) : [];
  return {
    history,
    target,
    origins,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ArtifactDetails);
