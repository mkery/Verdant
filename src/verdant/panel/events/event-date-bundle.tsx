import * as React from "react";
import NotebookEvent from "./event";
import {verdantState} from "../../redux";
import {connect} from "react-redux";
import {
  bundleClose,
  bundleOpen,
  eventState
} from "../../redux/events";

const DATE_BUNDLE_HEADER = "Verdant-events-date-bundle-header";
const DATE_BUNDLE_CONTAINER = "Verdant-events-date-bundle-container";


type DateBundle_Props = {
  events: number[]; // Indices of events prop of NotebookEventDate
  date_id: number;
  bundle_id: number; // Index of bundle in date
  event_states: eventState[];
  isOpen: boolean;
  open: (d: number, b: number) => void;
  close: (d: number, b: number) => void;
}

class NotebookEventDateBundle extends React.Component<DateBundle_Props> {
  render() {
    if (this.props.events.length == 1) {
      return (
        <NotebookEvent
          date_id={this.props.date_id}
          event_id={this.props.events[0]}
          events={this.props.event_states[this.props.events[0]]}
        />
      );
    } else {
      const lastEvent = this.props.events[0];
      const firstEvent = this.props.events[this.props.events.length - 1];
      const open = () =>
        this.props.open(this.props.date_id, this.props.bundle_id);
      const close = () =>
        this.props.close(this.props.date_id, this.props.bundle_id);
      return ( // TODO: Add header with conditional generation
        <div>
          <div
            className={`${DATE_BUNDLE_HEADER} 
                        ${this.props.isOpen ? "hidden" : ""}`}
            onClick={() => {this.props.isOpen ? close() : open()}}>
            {`# ${this.props.event_states[firstEvent].notebook + 1} - 
             ${this.props.event_states[lastEvent].notebook + 1}`}
          </div>
          <div className={DATE_BUNDLE_CONTAINER}>
            {this.props.events.map((id) => (
              <div key={id}>
                <NotebookEvent
                  date_id={this.props.date_id}
                  event_id={id}
                  events={this.props.event_states[id]}
                />
              </div>
            ))}
          </div>
        </div>
      );
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
  return {
    event_states: state.dates[ownProps.date_id].events,
    isOpen: state.dates[ownProps.date_id]
      .bundleStates[ownProps.bundle_id].isOpen
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotebookEventDateBundle);
