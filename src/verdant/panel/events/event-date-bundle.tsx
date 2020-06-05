import * as React from "react";
import NotebookEvent from "./event";
import {verdantState} from "../../redux";
import {connect} from "react-redux";
import {
  bundleClose,
  bundleOpen,
  eventState
} from "../../redux/events";
import NotebookEventLabel from "./event-label";
import {Checkpoint} from "../../../lilgit/model/checkpoint";

const DATE_BUNDLE_HEADER = "Verdant-events-date-bundle-header";
const DATE_BUNDLE_HEADER_LABEL = "Verdant-events-date-bundle-header-label";
const DATE_BUNDLE_HEADER_NUMBERS = "Verdant-events-date-bundle-header-numbers";
const DATE_ARROW = "Verdant-events-date-collapse-header-arrow";
const DATE_BUNDLE_CONTAINER = "Verdant-events-date-bundle-container";


type DateBundle_Props = {
  events: number[]; // Indices of events prop of NotebookEventDate
  date_id: number;
  bundle_id: number; // Index of bundle in date
  event_states: eventState[];
  isOpen: boolean;
  open: (d: number, b: number) => void;
  close: (d: number, b: number) => void;
  checkpoints: Checkpoint[];
}

class NotebookEventDateBundle extends React.Component<DateBundle_Props> {
  renderSingle() {
    /* Render a single event (no bundle) */
    return (
      <NotebookEvent
        date_id={this.props.date_id}
        event_id={this.props.events[0]}
        events={this.props.event_states[this.props.events[0]]}
      />
    );
  }

  renderBundleLabel() {
    /* Render the label for a bundle of events */
    const lastEvent = this.props.events[0];
    const firstEvent = this.props.events[this.props.events.length - 1];

    const open = () =>
      this.props.open(this.props.date_id, this.props.bundle_id);
    const close = () =>
      this.props.close(this.props.date_id, this.props.bundle_id);

    return (
      <div
        className={`${DATE_BUNDLE_HEADER} ${this.props.isOpen ? "" : "closed"}`}
        onClick={() => {this.props.isOpen ? close() : open()}}
      >
        <div className={DATE_BUNDLE_HEADER_LABEL}>
          <NotebookEventLabel
            date_id={this.props.date_id}
            event_id={null}
            events={this.props.checkpoints}
          />
        </div>

        <div className={DATE_BUNDLE_HEADER_NUMBERS}>
          <div>
            {`# ${this.props.event_states[firstEvent].notebook + 1} - 
              ${this.props.event_states[lastEvent].notebook + 1}`}
          </div>
          <div className={`${DATE_ARROW} ${this.props.isOpen ? "" : "closed"}`}>
          </div>
        </div>
      </div>
    );
  }

  renderBundleBody() {
    /* Render the individual events of the body of the bundle */
    return (<div className={DATE_BUNDLE_CONTAINER}>
      {this.props.events.map((id) => (
        <div key={id}>
          <NotebookEvent
            date_id={this.props.date_id}
            event_id={id}
            events={this.props.event_states[id]}
          />
        </div>
      ))}
    </div>);
  }

  renderBundle() {
    /* Render a bundle of events */
    return (
      <div>
        {this.renderBundleLabel()}
        {this.props.isOpen ? this.renderBundleBody() : null}
      </div>
    );
  }

  render() {
    if (this.props.events.length == 1) {
      return this.renderSingle();
    } else {
      return this.renderBundle();
    }
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d, b) => dispatch(bundleOpen(d, b)),
    close: (d, b) => dispatch(bundleClose(d, b))
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<DateBundle_Props>
) => {
  const checkpoints = ownProps.events.map(
    e => state.dates[ownProps.date_id].events[e].events
  ).reduceRight(
    (acc, current) => acc.concat(current), []
  )
  return {
    event_states: state.dates[ownProps.date_id].events,
    isOpen: state.dates[ownProps.date_id]
      .bundleStates[ownProps.bundle_id].isOpen,
    checkpoints: checkpoints
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotebookEventDateBundle);
