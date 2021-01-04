import * as React from "react";
import { Nodey, NodeyOutput, NodeyCode } from "../../../verdant-model/nodey";
import VersionDetail from "./version-detail";
import VersionHeader from "./version-header";
import { Namer } from "../../../verdant-model/sampler";
import { History } from "../../../verdant-model/history";
import {
  verdantState,
  showDetailOfNode,
  openPair,
  closePair,
} from "../../redux/index";
import { connect } from "react-redux";
import { BigChevronRightIcon, BigChevronLeftIcon } from "../../icons/";

export type VersionPair_Props = {
  history: History;
  showDetails: (n: Nodey) => void;
  dependent: Nodey | Nodey[];
  nodey: Nodey | Nodey[];
  open: boolean;
  openVersionPair: () => void;
  closeVersionPair: () => void;
};

class VersionPair extends React.Component<VersionPair_Props> {
  render() {
    return (
      <div
        className={`v-VerdantPanel-details-versionPair${
          this.props.open ? " open" : ""
        }`}
      >
        <div
          className={`v-VerdantPanel-details-versionPair-col left${
            this.props.open ? " open" : ""
          }`}
        >
          {this.showLeft()}
        </div>
        {this.showRight()}
      </div>
    );
  }

  showLeft() {
    if (this.props.open) return this.showLeftOpen();
    return this.showLeftClosed();
  }

  showRight() {
    if (this.props.open) return this.showRightOpen();
    return null;
  }

  showRightOpen() {
    // if open, show dependencies in list
    let vers: Nodey[] = [];
    if (Array.isArray(this.props.dependent)) vers = this.props.dependent;
    else vers.push(this.props.dependent);

    return (
      <div
        className={`v-VerdantPanel-details-versionPair-col right${
          this.props.open ? " open" : ""
        }`}
      >
        <div className="v-VerdantPanel-details-version-header dependent open">
          <div onClick={() => this.props.closeVersionPair()}>
            <BigChevronLeftIcon />
          </div>
        </div>
        {vers.reverse().map((v, i) => (
          <VersionDetail key={i} nodey={v} />
        ))}
      </div>
    );
  }

  showLeftOpen() {
    // if open, show versions in a plain list
    let vers: Nodey[] = [];
    if (Array.isArray(this.props.nodey)) vers = this.props.nodey;
    else vers.push(this.props.nodey);

    return vers.reverse().map((v, i) => <VersionDetail key={i} nodey={v} />);
  }

  showLeftClosed() {
    // if closed, just show all versions the same way
    let vers: Nodey[] = [];
    if (Array.isArray(this.props.nodey)) vers = this.props.nodey;
    else vers.push(this.props.nodey);

    return vers.reverse().map((v, i) => {
      return (
        <div key={i}>
          <div className="v-VerdantPanel-details-versionPair-header">
            <VersionHeader nodey={v} />
            {this.closedRightHeader()}
          </div>
          <VersionDetail nodey={v} no_header={true} />
        </div>
      );
    });
  }

  closedRightHeader() {
    let vers: Nodey[] = [];
    if (Array.isArray(this.props.dependent)) vers = this.props.dependent;
    else vers.push(this.props.dependent);

    return (
      <div className="v-VerdantPanel-details-version-header dependent closed">
        <div className="v-VerdantPanel-details-version-header-labelRow dependent">
          {this.describeDependent(vers)}
          <div onClick={() => this.props.openVersionPair()}>
            <BigChevronRightIcon />
          </div>
        </div>
      </div>
    );
  }

  describeDependent(vers: Nodey[]) {
    // Nodey Output
    if (vers[0] instanceof NodeyOutput) {
      if (vers.length > 1)
        return (
          <span>
            <b>{vers.length}</b>
            <span>{" outputs"}</span>
          </span>
        );
      else
        return (
          <span>
            {"output "}
            <span
              className="verdant-link"
              onClick={() => this.props.showDetails(vers[0])}
            >
              {Namer.getOutputVersionTitle(
                vers[0] as NodeyOutput,
                this.props.history
              )}
            </span>
          </span>
        );
    }
    // Nodey Code
    else if (vers[0] instanceof NodeyCode) {
      return (
        <span>
          {"code "}
          <span
            className="verdant-link"
            onClick={() => this.props.showDetails(vers[0])}
          >
            {Namer.getCellVersionTitle(vers[0])}
          </span>
        </span>
      );
    }
  }
}

const mapDispatchToProps = (
  dispatch: any,
  ownProps: Partial<VersionPair_Props>
) => {
  let nodey;
  if (Array.isArray(ownProps.nodey)) nodey = ownProps.nodey[0];
  else nodey = ownProps.nodey;
  return {
    showDetails: (n: Nodey) => {
      dispatch(showDetailOfNode(n));
    },
    openVersionPair: () => {
      dispatch(openPair(nodey.name));
    },
    closeVersionPair: () => {
      dispatch(closePair(nodey.name));
    },
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<VersionPair_Props>
) => {
  let nodey;
  if (Array.isArray(ownProps.nodey)) nodey = ownProps.nodey[0];
  else nodey = ownProps.nodey;
  const open = state.artifactView.openDetailPairs.includes(nodey.name);
  return {
    history: state.getHistory(),
    open,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VersionPair);
