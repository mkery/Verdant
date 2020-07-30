import * as React from "react";
import InspectorButton from "./inspector-button";
import { History } from "../../lilgit/history/";
import VersionDetail from "./details/version-detail";
import CrumbMenu from "./details/crumbMenu";
import { Nodey } from "../../lilgit/nodey/";
import { verdantState } from "../redux/index";
import { connect } from "react-redux";

const PANEL = "v-VerdantPanel-content";
const HEADER = "v-VerdantPanel-tab-header";

export type Details_Props = {
  history: History;
  openGhostBook: (node: number) => void;
  target: Nodey;
};

class ArtifactDetails extends React.Component<Details_Props> {
  render() {
    return (
      <div className={PANEL}>
        <div className={HEADER}>
          <CrumbMenu />
        </div>
        <div className={PANEL}>{this.showVersions()}</div>
        <InspectorButton />
      </div>
    );
  }

  showVersions() {
    let elems = [];
    let versions = this.props.history.store.getHistoryOf(this.props.target);
    for (let i = versions.length - 1; i >= 0; i--) {
      elems.push(<VersionDetail key={i} nodey={versions.getVersion(i)} />);
    }
    return elems;
  }

  /*buildMixins(target: Nodey): JSX.Element[] {
    let notebookLink = this.props.openGhostBook;
    let elems: JSX.Element[] = [];
    elems.push(
      <Mixin
        key={"nodey" + target.id}
        history={this.props.history}
        target={this.props.target}
        headerShowing={false}
        notebookLink={notebookLink}
      />
    );

    if (target instanceof NodeyCode) {
      let output = this.props.history.store.get(target.output);
      if (output) {
        elems.push(
          <Mixin
            key={"output" + output.id}
            history={this.props.history}
            target={output}
            headerShowing={true}
            notebookLink={notebookLink}
          />
        );
      }
    }

    elems = elems.concat(this.buildOrigins(target));
    return elems;
  }

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

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
    target: state.inspectTarget,
  };
};

export default connect(mapStateToProps, null)(ArtifactDetails);
