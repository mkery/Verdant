import * as React from "react";
import NotebookEvent from "./event";
import { verdantState } from "../../redux";
import { connect } from "react-redux";
import { bundleClose, bundleOpen, eventState } from "../../redux/events";
import NotebookEventLabel from "./event-label";
import { Checkpoint } from "../../../lilgit/checkpoint";
import NotebookEventMap from "./event-map";

/* CSS Constants */
const BUNDLE = "Verdant-events-bundle";
const BUNDLE_SINGLE = `${BUNDLE}-single`;
const BUNDLE_MULTI = `${BUNDLE}-multi`;
const BUNDLE_MULTI_HEADER = `${BUNDLE_MULTI}-header`;
const BUNDLE_MULTI_HEADER_ARROW = `${BUNDLE_MULTI_HEADER}-arrow`;
const BUNDLE_MULTI_HEADER_ARROW_IMAGE = `${BUNDLE_MULTI_HEADER_ARROW}-image`;
const BUNDLE_MULTI_HEADER_CONTAINER = `${BUNDLE_MULTI_HEADER}-container`;
const BUNDLE_MULTI_HEADER_CONTAINER_CLOSED = `Verdant-events-event`;
const BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_STAMP = `${BUNDLE_MULTI_HEADER_CONTAINER_CLOSED}-stamp`;
const BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW = `${BUNDLE_MULTI_HEADER_CONTAINER_CLOSED}-row`;
const BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW_INDEX = `${BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW}-index`;
const BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW_MAP = `${BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW}-map`;
const BUNDLE_MULTI_HEADER_CONTAINER_OPEN = `${BUNDLE_MULTI_HEADER_CONTAINER}-open`;
const BUNDLE_MULTI_BODY = `${BUNDLE_MULTI}-body`;
const BUNDLE_MULTI_FOOTER = `${BUNDLE_MULTI}-footer`;
const BUNDLE_MULTI_FOOTER_LINE = `${BUNDLE_MULTI_FOOTER}-line`;
const BUNDLE_MULTI_FOOTER_SPACER = `${BUNDLE_MULTI_FOOTER}-spacer`;

type DateBundle_Props = {
  events: number[]; // Indices of events prop of NotebookEventDate
  date_id: number;
  bundle_id: number; // Index of bundle in date
  event_states: eventState[];
  isOpen: boolean;
  open: (d: number, b: number) => void;
  close: (d: number, b: number) => void;
  checkpoints: Checkpoint[];
};

class NotebookEventDateBundle extends React.Component<DateBundle_Props> {
  render() {
    return (
      <div className={BUNDLE}>
        {this.props.events.length === 1
          ? this.renderSingle()
          : this.renderBundle()}
      </div>
    );
  }

  renderSingle() {
    /* Render a single event (no bundle) */
    return (
      <div className={BUNDLE_SINGLE}>
        <NotebookEvent
          date_id={this.props.date_id}
          event_id={this.props.events[0]}
          events={this.props.event_states[this.props.events[0]]}
        />
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
      <div className={BUNDLE_MULTI}>
        {this.props.isOpen ? (
          <>
            <div className={BUNDLE_MULTI_HEADER} onClick={() => close()}>
              <div className={BUNDLE_MULTI_HEADER_CONTAINER}>
                {this.renderBundleHeaderOpen()}
              </div>
              <div className={BUNDLE_MULTI_HEADER_ARROW}>
                <div className={BUNDLE_MULTI_HEADER_ARROW_IMAGE}></div>
              </div>
            </div>
            {this.renderBundleBody()}
            {this.renderBundleFooter()}
          </>
        ) : (
          <div className={BUNDLE_MULTI_HEADER} onClick={() => open()}>
            <div className={BUNDLE_MULTI_HEADER_CONTAINER}>
              {this.renderBundleHeaderClosed()}
            </div>
            <div className={BUNDLE_MULTI_HEADER_ARROW}>
              <div
                className={`${BUNDLE_MULTI_HEADER_ARROW_IMAGE} closed`}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderBundleHeaderClosed() {
    /* Render the header for a closed bundle of events */
    const lastEvent = this.props.events[0];
    const firstEvent = this.props.events[this.props.events.length - 1];

    return (
      <div className={BUNDLE_MULTI_HEADER_CONTAINER_CLOSED}>
        <div className={BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_STAMP}>
          <NotebookEventLabel
            date_id={this.props.date_id}
            event_id={null}
            events={this.props.checkpoints}
          />
        </div>
        <div className={BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW}>
          <div className={BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW_INDEX}>
            {`# ${this.props.event_states[firstEvent].notebook + 1} - 
              ${this.props.event_states[lastEvent].notebook + 1}`}
          </div>
          <div className={BUNDLE_MULTI_HEADER_CONTAINER_CLOSED_ROW_MAP}>
            <NotebookEventMap checkpoints={this.props.checkpoints} />
          </div>
        </div>
      </div>
    );
  }

  renderBundleHeaderOpen() {
    /* Render the header for an open bundle of events */
    const lastEvent = this.props.events[0];
    const firstEvent = this.props.events[this.props.events.length - 1];

    return (
      <div className={BUNDLE_MULTI_HEADER_CONTAINER_OPEN}>
        {`# ${this.props.event_states[firstEvent].notebook + 1} - 
              ${this.props.event_states[lastEvent].notebook + 1}`}
      </div>
    );
  }

  renderBundleBody() {
    /* Render the individual events of the body of the bundle */
    return (
      <div className={BUNDLE_MULTI_BODY}>
        {this.props.events.map((id) => (
          <NotebookEvent
            key={id}
            date_id={this.props.date_id}
            event_id={id}
            events={this.props.event_states[id]}
          />
        ))}
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

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<DateBundle_Props>
) => {
  const checkpoints = ownProps.events
    .map((e) => state.dates[ownProps.date_id].events[e].events)
    .reduceRight((acc, current) => acc.concat(current), []);
  return {
    event_states: state.dates[ownProps.date_id].events,
    isOpen:
      state.dates[ownProps.date_id].bundleStates[ownProps.bundle_id].isOpen,
    checkpoints: checkpoints,
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotebookEventDateBundle);
