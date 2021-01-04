import * as React from "react";
import ArtifactDetails from "./details";
import ArtifactSummary from "./summary";
import EventMap from "./events";
import Search from "./search";
import { ActiveTab, switchTab, verdantState } from "../redux";
import { SearchIcon } from "../icons";
import { connect } from "react-redux";

const PANEL_CONTAINER = "v-VerdantPanel-content-container";
const TAB_CONTAINER = "v-VerdantPanel-tabContainer";
const TAB = "v-VerdantPanel-tab";

type Panel_Props = {
  activeTab: ActiveTab;
  showingDetail: boolean;
  setActiveTab: (n: ActiveTab) => void;
};

class PanelContainer extends React.Component<Panel_Props> {
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
          className={`${TAB} ${
            active === ActiveTab.Artifacts ||
            active === ActiveTab.Artifact_Details
              ? "active"
              : ""
          }`}
          onClick={() =>
            this.props.setActiveTab(
              this.props.showingDetail
                ? ActiveTab.Artifact_Details
                : ActiveTab.Artifacts
            )
          }
        >
          Artifacts
        </div>
        <div
          className={`${TAB} ${active === ActiveTab.Search ? "active" : ""}`}
          onClick={() => this.props.setActiveTab(ActiveTab.Search)}
          style={{ borderRightWidth: "0px" }}
        >
          <SearchIcon />
        </div>
      </div>
    );
  }

  showTab() {
    let active = this.props.activeTab;
    if (active === ActiveTab.Events) return <EventMap />;
    if (active === ActiveTab.Artifacts) return <ArtifactSummary />;
    if (active === ActiveTab.Artifact_Details) return <ArtifactDetails />;
    if (active === ActiveTab.Search) return <Search />;
    return null;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    activeTab: state.activeTab,
    showingDetail: state.artifactView.showingDetail,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    setActiveTab: (name: ActiveTab) => dispatch(switchTab(name)),
  };
};

const Panel = connect(mapStateToProps, mapDispatchToProps)(PanelContainer);

export default Panel;
