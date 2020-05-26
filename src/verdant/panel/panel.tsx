import * as React from "react";
import { History } from "../../lilgit/model/history";
import ArtifactDetails from "./artifact-details";
import ArtifactSummary from "./artifact-summary";
import EventMap from "./event-map";
import Search from "./search";
import { ActiveTab, switchTab, verdantState } from "../redux/index";
import { connect } from "react-redux";

const PANEL_CONTAINER = "v-VerdantPanel-content-container";
const TAB_CONTAINER = "v-VerdantPanel-tabContainer";
const TAB = "v-VerdantPanel-tab";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";

type Panel_Props = {
  history: History;
  activeTab: ActiveTab;
  setActiveTab: (n: ActiveTab) => void;
  openGhostBook: (n: number) => void;
};

class PanelContainer extends React.Component<Partial<Panel_Props>> {
  render() {
    return (
      <div className="v-VerdantPanel">
        {this.buildHeader()}
        <div className={PANEL_CONTAINER}>{this.showTab()}</div>
      </div>
    );
  }

  private buildHeader() {
    let active = this.props.activeTab;
    return (
      <div className={TAB_CONTAINER}>
        <div
          className={`${TAB} ${active === ActiveTab.Events ? "active" : ""}`}
          onClick={() => this.props.setActiveTab(ActiveTab.Events)}
        >
          Activity
        </div>
        <div
          className={`${TAB} ${active === ActiveTab.Artifacts ? "active" : ""}`}
          onClick={() => this.props.setActiveTab(ActiveTab.Artifacts)}
        >
          Artifacts
        </div>
        <div
          className={`${TAB} ${active === ActiveTab.Search ? "active" : ""}`}
          onClick={() => this.props.setActiveTab(ActiveTab.Search)}
          style={{ borderRightWidth: "0px" }}
        >
          <div className={`${SEARCH_ICON} header`}></div>
        </div>
      </div>
    );
  }

  showTab() {
    let active = this.props.activeTab;
    if (active === ActiveTab.Events) return <EventMap />;
    if (active === ActiveTab.Artifacts) return <ArtifactSummary />;
    if (active === ActiveTab.Artifact_Details)
      // TODO split CrumbBox into 2 views
      return <ArtifactDetails />;
    if (active === ActiveTab.Search) return <Search />;
    return null;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.history,
    activeTab: state.activeTab,
    openGhostBook: state.openGhostBook
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    setActiveTab: (name: ActiveTab) => dispatch(switchTab(name))
  };
};

const Panel = connect(
  mapStateToProps,
  mapDispatchToProps
)(PanelContainer);

export default Panel;
