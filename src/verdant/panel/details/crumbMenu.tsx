import * as React from "react";
import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  NodeyCodeCell,
} from "../../../lilgit/nodey/";
import { History } from "../../../lilgit/history/";
import { verdantState, ActiveTab, switchTab, inspectNode } from "../../redux/";
import { connect } from "react-redux";
import { Namer } from "../../../lilgit/sampler";

export type CrumbMenu_Props = {
  showSummary: () => void;
  showDetails: (n: Nodey) => void;
  history: History;
  target: Nodey;
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

  pathToCode() {
    if (this.props.target instanceof NodeyCodeCell) {
      return <Item label={Namer.getCellTitle(this.props.target)} />;
    } else {
      let cell = this.props.history.store.getCellParent(this.props.target);
      return (
        <span>
          <Item
            label={Namer.getCellTitle(cell)}
            onClick={() => this.props.showDetails(cell)}
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

class Seperator extends React.Component {
  render() {
    return <div className="v-VerdantPanel-crumbMenu-seperator">{">"}</div>;
  }
}

class Item extends React.Component<{ onClick?: () => void; label: string }> {
  render() {
    return (
      <div
        className="v-VerdantPanel-crumbMenu-item"
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
      dispatch(inspectNode(n));
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    target: state.inspectTarget,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CrumbMenu);
