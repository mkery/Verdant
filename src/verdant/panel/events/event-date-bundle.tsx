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
import {History} from "../../../lilgit/model/history";
import NotebookEventMap from "./event-map";

const DATE_BUNDLE_HEADER = "Verdant-events-row";
const DATE_BUNDLE_HEADER_CLOSED = "Verdant-date-bundle-closed";
const DATE_BUNDLE_HEADER_LABEL = "Verdant-events-column label";
const DATE_BUNDLE_HEADER_NUMBERS = "Verdant-events-column map";
const EVENT_INDEX_LABEL = "Verdant-events-index-label";
const EVENT_MAP_LABEL = "Verdant-events-map-label";


type DateBundle_Props = {
  events: number[]; // Indices of events prop of NotebookEventDate
  date_id: number;
  bundle_id: number; // Index of bundle in date
  event_states: eventState[];
  history: History;
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
        className={`${DATE_BUNDLE_HEADER} 
        ${this.props.isOpen ? "" : DATE_BUNDLE_HEADER_CLOSED}`}
        onClick={() => {
          this.props.isOpen ? close() : open()
        }}
      >
        <div className={DATE_BUNDLE_HEADER_LABEL}>
          <NotebookEventLabel
            date_id={this.props.date_id}
            event_id={null}
            events={this.props.checkpoints}
          />
        </div>
        <div className={DATE_BUNDLE_HEADER_NUMBERS}>
          <div className={EVENT_INDEX_LABEL}>
            {`# ${this.props.event_states[firstEvent].notebook + 1} - 
              ${this.props.event_states[lastEvent].notebook + 1}`}
          </div>
          <div className={EVENT_MAP_LABEL}>
            {
              this.props.isOpen ?
                <div></div> :
                <NotebookEventMap
                  checkpoints={this.props.checkpoints}
                  history={this.props.history}
                />
            }
          </div>
        </div>
      </div>
    );
  }

  renderBundleBody() {
    /* Render the individual events of the body of the bundle */
    return (this.props.events.map((id) => (
      <div key={id}>
        <NotebookEvent
          date_id={this.props.date_id}
          event_id={id}
          events={this.props.event_states[id]}
        />
      </div>
    )));
  }

  renderBundle() {
    /* Render a bundle of events */
    return (
      <>
        {this.renderBundleLabel()}
        {this.props.isOpen ? this.renderBundleBody() : null}
      </>
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
    checkpoints: checkpoints,
    history: state.getHistory()
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotebookEventDateBundle);
