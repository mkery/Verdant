import * as React from "react";
import NotebookEvent from "./event";
import { connect } from "react-redux";
import { verdantState, bundleClose, bundleOpen } from "../../redux";
import NotebookEventLabel from "./event-label";
import MiniMap from "./mini-map";
import { Namer } from "../../../verdant-model/sampler";
import { History } from "../../../verdant-model/history";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons";
import { CellRunData, Checkpoint } from "verdant/verdant-model/checkpoint";

/* CSS Constants */
const BUNDLE_MULTI_BODY = `Verdant-events-bundle-multi-body`;
const BUNDLE_MULTI_FOOTER = `Verdant-events-bundle-multi-footer`;
const BUNDLE_MULTI_FOOTER_LINE = `${BUNDLE_MULTI_FOOTER}-line`;
const BUNDLE_MULTI_FOOTER_SPACER = `${BUNDLE_MULTI_FOOTER}-spacer`;

type req_Bundle_Props = {
  date_id: number;
  bundle_id: number; // Index of bundle in date
};

type Bundle_Props = {
  // provided by redux store
  isOpen: boolean;
  open: (d: number, b: number) => void;
  close: (d: number, b: number) => void;
  targets: CellRunData[];
  checkpoints: Checkpoint[];
  history: History;
} & req_Bundle_Props;

class EventBundle extends React.Component<Bundle_Props> {
  render() {
    if (!this.props.checkpoints) return null;
    if (this.props.checkpoints.length === 1) return this.renderSingle();
    return this.renderBundle();
  }

  renderSingle() {
    /* Render a single event (no bundle) */
    return (
      <div className="Verdant-events-bundle-single">
        <NotebookEvent checkpoint={this.props.checkpoints[0]} />
      </div>
    );
  }

  renderBundle() {
    /* Render a bundle of events */

    const close = () =>
      this.props.close(this.props.date_id, this.props.bundle_id);

    const open = () =>
      this.props.open(this.props.date_id, this.props.bundle_id);

    return (
      <div>
        {this.props.isOpen ? (
          <>
            <div
              className="Verdant-events-bundle-multi-header"
              onClick={() => close()}
            >
              {this.showArrow()}
              <div className="Verdant-events-bundle-multi-header-container">
                {this.renderBundleHeaderOpen()}
              </div>
            </div>
            {this.renderBundleBody()}
            {this.renderBundleFooter()}
          </>
        ) : (
          <div
            className="Verdant-events-bundle-multi-header"
            onClick={() => open()}
          >
            {this.showArrow()}
            <div className="Verdant-events-bundle-multi-header-container">
              {this.renderBundleHeaderClosed()}
            </div>
          </div>
        )}
      </div>
    );
  }

  private showArrow() {
    if (this.props.isOpen)
      return (
        <div className="Verdant-events-bundle-multi-header-arrow open">
          <ChevronDownIcon />
        </div>
      );
    return (
      <div className="Verdant-events-bundle-multi-header-arrow">
        <ChevronRightIcon />
      </div>
    );
  }

  renderBundleHeaderClosed() {
    /* Render the header for a closed bundle of events */
    const firstNotebook = this.props.history.store.getNotebook(
      this.props.checkpoints[0].notebook
    );
    const lastNotebook = this.props.history.store.getNotebook(
      this.props.checkpoints[this.props.checkpoints.length - 1].notebook
    );

    return (
      <div className="Verdant-events-event bundle">
        <div className="Verdant-events-event-stamp">
          <NotebookEventLabel events={this.props.checkpoints} />
        </div>
        <div className="Verdant-events-event-row-index">
          {`${Namer.getNotebookVersionLabel(firstNotebook)} - 
              ${Namer.getNotebookVersionLabel(lastNotebook)}`}
        </div>
        <div className="Verdant-events-event-row-map">
          <MiniMap
            targets={this.props.targets}
            notebook_ver={this.props.checkpoints[0]?.notebook}
          />
        </div>
      </div>
    );
  }

  renderBundleHeaderOpen() {
    /* Render the header for an open bundle of events */
    const firstNotebook = this.props.history.store.getNotebook(
      this.props.checkpoints[0].notebook
    );
    const lastNotebook = this.props.history.store.getNotebook(
      this.props.checkpoints[this.props.checkpoints.length - 1].notebook
    );

    return (
      <div className="Verdant-events-bundle-multi-header-container open">
        {`${Namer.getNotebookVersionLabel(firstNotebook)} - 
              ${Namer.getNotebookVersionLabel(lastNotebook)}`}
      </div>
    );
  }

  renderBundleBody() {
    /* Render the individual events of the body of the bundle */
    return (
      <div className={BUNDLE_MULTI_BODY}>
        {this.props.checkpoints.map((checkpoint, index) => {
          return <NotebookEvent key={index} checkpoint={checkpoint} />;
        })}
      </div>
    );
  }

  renderBundleFooter() {
    /* Render the bottom of an open bundle */
    return (
      <div className={BUNDLE_MULTI_FOOTER}>
        <div className={BUNDLE_MULTI_FOOTER_LINE}></div>
        <div className={BUNDLE_MULTI_FOOTER_SPACER}></div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d, b) => dispatch(bundleOpen(d, b)),
    close: (d, b) => dispatch(bundleClose(d, b)),
  };
};

const mapStateToProps = (state: verdantState, ownProps: req_Bundle_Props) => {
  const history = state.getHistory();
  const bundle =
    state.eventView.dates[ownProps.date_id].bundles[ownProps.bundle_id];
  const targets = bundle?.bundleTargets;
  const checkpoints = bundle?.bundleEvents?.map(
    (ev) => state.eventView.dates[ownProps.date_id].events[ev]
  );
  const changeCount = bundle ? Object.keys(bundle?.bundleTargets).length : -1;

  return {
    isOpen: bundle?.isOpen,
    changeCount,
    history,
    checkpoints,
    targets,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(EventBundle);
