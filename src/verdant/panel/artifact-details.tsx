import * as React from "react";
import InspectorButton from "./inspector-button";
import { History } from "../../lilgit/history/";
import VersionDetail from "./details/version-detail";
import CrumbMenu from "./details/crumbMenu";
import { Nodey, NodeyCode } from "../../lilgit/nodey/";
import { verdantState, inspectNode } from "../redux/index";
import { connect } from "react-redux";

export type Details_Props = {
  history: History;
  openGhostBook: (node: number) => void;
  showDetails: (n: Nodey) => void;
  target: Nodey;
};

class ArtifactDetails extends React.Component<Details_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-content">
        <div className="v-VerdantPanel-tab-header">
          <CrumbMenu />
          {this.showOutputLink()}
        </div>
        <div className="v-VerdantPanel-content">{this.showVersions()}</div>
        <InspectorButton />
      </div>
    );
  }

  showOutputLink() {
    if (this.props.target instanceof NodeyCode) {
      let out = this.props.history.store.getAllOutput(this.props.target);
      if (out && out.length > 0) {
        return (
          <span
            className="v-VerdantPanel-tab-header-outLink verdant-link"
            onClick={() => this.props.showDetails(out[0].lastSaved)} //TODO!
          >
            show all output
          </span>
        );
      }
    }
    return null;
  }

  showVersions() {
    let elems = [];
    let versions = this.props.history.store.getHistoryOf(this.props.target);
    for (let i = versions.length - 1; i >= 0; i--) {
      let nodey = versions.getVersion(i);
      elems.push(<VersionDetail key={i} nodey={nodey} />);
    }
    return elems;
  }

  // version pair <Version Singleton > < Version List >
  // version pair <Version Singleton > (closed right side)
  // version pair <Version List > (closed right side)
  // version pair <Version Singleton > (has no right side)
  /*
  * steps: 1) figure out what L side and R side are
  * 2) version pair instantiates L and R as Version Singletons or Version List
  * 3) version pair manages the open/closed state of L side and R side
  * /

  /* TODO
  buildOrigins(nodey: Nodey): JSX.Element[] {
    let hist = this.props.history.store.getHistoryOf(nodey);
    if (hist.originPointer) {
      let label = Mixin.labelOrigin(nodey);
      let origin = this.props.history.store.get(hist.originPointer.origin);
      let elems = this.buildMixins(origin);
      elems.unshift(label);
      return elems;
    }
    return [];
  }*/
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showDetails: (n: Nodey) => {
      dispatch(inspectNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
    target: state.inspectTarget,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ArtifactDetails);
