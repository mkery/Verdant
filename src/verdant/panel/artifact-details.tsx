import * as React from "react";
import InspectorButton from "./summary/inspector-button";
import { History } from "../../lilgit/history/";
import { Mixin } from "./details/mixin";
import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
} from "../../lilgit/nodey/";
import { verdantState, ActiveTab, switchTab } from "../redux/index";
import { connect } from "react-redux";

const PANEL = "v-VerdantPanel-content";
const CRUMB_MENU = "v-VerdantPanel-crumbMenu";
const CRUMB_MENU_ITEM = "v-VerdantPanel-crumbMenu-item";
const HEADER = "v-VerdantPanel-tab-header";

export type Details_Props = {
  history: History;
  openGhostBook: (node: number) => void;
  showSummary: () => void;
  target: Nodey;
};

class ArtifactDetails extends React.Component<Details_Props> {
  render() {
    return (
      <div className={PANEL}>
        <div className={HEADER}>
          <div className={CRUMB_MENU}>{this.buildCrumbMenu()}</div>
          <InspectorButton />
        </div>
        {this.buildMixins(this.props.target)}
      </div>
    );
  }

  closeDetails() {
    this.props.showSummary();
  }

  buildCrumbMenu() {
    return (
      <div>
        <div className={CRUMB_MENU_ITEM} onClick={() => this.closeDetails()}>
          Notebook
        </div>
        {Mixin.addSeperator()}
        {this.buildLabels()}
      </div>
    );
  }

  buildLabels() {
    if (this.props.target) {
      if (this.props.target instanceof NodeyCode)
        return Mixin.labelNodeyCode(this.props.target, this.props.history);
      else if (this.props.target instanceof NodeyMarkdown)
        return Mixin.addItem("markdown " + this.props.target.id);
      else if (this.props.target instanceof NodeyOutput)
        return Mixin.addItem("output " + this.props.target.id);
    }
    return null;
  }

  buildMixins(target: Nodey): JSX.Element[] {
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
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showSummary: () => {
      dispatch(switchTab(ActiveTab.Artifacts));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    openGhostBook: state.openGhostBook,
    target: state.inspectTarget,
    showingDetail: state.activeTab === ActiveTab.Artifact_Details,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ArtifactDetails);
