import * as React from "react";
import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  NodeyCodeCell,
} from "../../../verdant-model/nodey";
import { History } from "../../../verdant-model/history";
import {
  verdantState,
  ActiveTab,
  switchTab,
  showDetailOfNode,
} from "../../redux/";
import { connect } from "react-redux";
import { Namer } from "../../../verdant-model/sampler";

export type CrumbMenu_Props = {
  showSummary: () => void;
  showDetails: (n: Nodey) => void;
  history: History;
  target: Nodey | null;
};

class CrumbMenu extends React.Component<CrumbMenu_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-crumbMenu">
        <Item label="Notebook" onClick={() => this.props.showSummary()} />
        <Seperator />
        {this.buildLabels()}
      </div>
    );
  }

  buildLabels() {
    if (this.props.target) {
      if (this.props.target instanceof NodeyCode) return this.pathToCode();
      else if (this.props.target instanceof NodeyMarkdown)
        return <Item label={Namer.getCellTitle(this.props.target)} />;
      else if (this.props.target instanceof NodeyOutput)
        return this.pathToOutput();
    }
    return null;
  }

  pathToOutput() {
    if (this.props.target) {
      let cell = this.props.history.store.getCellParent(this.props.target);
      return (
        <span>
          <Item
            label={Namer.getCellTitle(cell)}
            onClick={() => this.props.showDetails(cell)}
          />
          <Seperator />
          <Item label="Output" />
        </span>
      );
    }
    return null;
  }

  pathToCode() {
    if (this.props.target) {
      if (this.props.target instanceof NodeyCodeCell) {
        return <Item label={Namer.getCellTitle(this.props.target)} />;
      } else {
        let cell = this.props.history.store.getCellParent(this.props.target);
        return (
          <span>
            <Item
              label={Namer.getCellTitle(cell)}
              onClick={() => (cell ? this.props.showDetails(cell) : null)}
            />
            <Seperator />
            <Item
              label={Namer.getCodeSnippetTitle(this.props.target as NodeyCode)}
            />
          </span>
        );
      }
    }
  }
}

class Seperator extends React.Component {
  render() {
    return <div className="v-VerdantPanel-crumbMenu-seperator">{">"}</div>;
  }
}

class Item extends React.Component<{ onClick?: () => void; label: string }> {
  render() {
    let link = this.props.onClick;
    return (
      <div
        className={`v-VerdantPanel-crumbMenu-item ${
          link ? "verdant-link" : ""
        }`}
        onClick={this.props.onClick}
      >
        {this.props.label}
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    showSummary: () => {
      dispatch(switchTab(ActiveTab.Artifacts));
    },
    showDetails: (n: Nodey) => {
      dispatch(showDetailOfNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    target: state.artifactView.inspectTarget,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CrumbMenu);
