import * as React from "react";
import { connect } from "react-redux";
import { verdantState } from "../../redux/index";
import { Checkpoint, CheckpointType } from "../../../lilgit/model/checkpoint";
import {
  dateOpen,
  dateClose,
  saveBundles,
  eventState,
} from "../../redux/events";
import NotebookEventDateBundle from "./event-date-bundle";

/* CSS Constants */
const DATE = "Verdant-events-date";
const DATE_HEADER = `${DATE}-header`;
const DATE_HEADER_LABEL = `${DATE_HEADER}-label`;
const DATE_HEADER_COLLAPSE = `${DATE_HEADER}-collapse`;
const DATE_HEADER_COLLAPSE_COUNT = `${DATE_HEADER_COLLAPSE}-count`;
const DATE_HEADER_COLLAPSE_ARROW = `${DATE_HEADER_COLLAPSE}-arrow`;

const INTERVAL_WIDTH = 300000; // Max bundle time interval in milliseconds

interface accumulatorObject {
  accumulator: number[][]; // Holds partially constructed bundle output
  timeBound: number; // Lower limit on time for inclusion in latest bundle
  lastType: CheckpointType; // Type of current bundle
}

type NotebookDate_Props = {
  date_id: number;
  date: number;
  events: eventState[];
  isOpen: boolean;
  open: (d: number) => void;
  close: (d: number) => void;
  bundles: number[][];
  saveBundles: (bundles: number[][], d: number) => void;
};

class NotebookEventDate extends React.Component<NotebookDate_Props> {
  render() {
    return (
      <div className={DATE}>
        <div
          className={DATE_HEADER}
          onClick={() => {
            if (this.props.isOpen) this.props.close(this.props.date_id);
            else this.props.open(this.props.date_id);
          }}
        >
          <div className={DATE_HEADER_LABEL}>
            {Checkpoint.formatDate(this.props.date)}
          </div>
          <div className={DATE_HEADER_COLLAPSE}>
            <div
              className={`${DATE_HEADER_COLLAPSE_COUNT} 
              ${this.props.isOpen ? "hidden" : ""}`}
            >
              ({this.props.events.length})
            </div>
            <div
              className={`${DATE_HEADER_COLLAPSE_ARROW} 
              ${this.props.isOpen ? "" : "closed"}`}
            ></div>
          </div>
        </div>
        <div>{this.props.isOpen ? this.makeBundles() : null}</div>
      </div>
    );
  }

  private makeBundles() {
    /* Creates date bundles using bundled indices */
    let bundledIndices;
    if (
      this.props.bundles === null || // There are no saved bundles
      this.props.bundles.reduce(
        // The bundles are out of date
        (a, x) => a + x.length,
        0
      ) !== this.props.events.length
    ) {
      // If there are no bundles or the bundles need an update, compute bundles
      bundledIndices = this.computeBundles(this.props.events);
      this.props.saveBundles(bundledIndices, this.props.date_id);
    } else {
      // Retrieve stored bundles
      bundledIndices = this.props.bundles;
    }

    // Creates DateBundle for each set of dates
    return bundledIndices.map((idx_list, i) => (
      <NotebookEventDateBundle
        key={i}
        bundle_id={i}
        events={[...idx_list]}
        date_id={this.props.date_id}
      />
    ));
  }

  private computeBundles(events: eventState[]): number[][] {
    /* Helper method for makeBundles.
       Computes list of bundled indices based on timestamp, ordered such that
       flattening the outer list leads to a reversed list of the indices of
       this.props.events */

    return events.reduceRight(this.reducer, {
      accumulator: [],
      timeBound: Infinity,
      lastType: null,
    }).accumulator;
  }

  private reducer(accObj: accumulatorObject, e: eventState, idx) {
    /* Helper method for computeBundles.
       Function to use in reducing over bundles in computeBundles. */
    // Compute properties of current element
    let timeStamp = e.events[0].timestamp;
    let eventType = NotebookEventDate.eventType(e);
    if (timeStamp > accObj.timeBound && eventType === accObj.lastType) {
      // add event to current bundle
      const newAccumulator = accObj.accumulator
        .slice(0, -1)
        .concat([
          accObj.accumulator[accObj.accumulator.length - 1].concat([idx]),
        ]);
      return {
        accumulator: newAccumulator,
        timeBound: accObj.timeBound,
        lastType: accObj.lastType,
      };
    } else {
      // create new bundle
      return {
        accumulator: accObj.accumulator.concat([[idx]]),
        timeBound: timeStamp - INTERVAL_WIDTH,
        lastType: eventType,
      };
    }
  }

  private static eventType(e: eventState): CheckpointType {
    /* Helper for reducer.
       Returns CheckpointType if all checkpoints in event have same type,
       else returns null */
    return e.events
      .map((c) => c.checkpointType)
      .reduce((acc, current) => (acc === current ? acc : null));
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d) => dispatch(dateOpen(d)),
    close: (d) => dispatch(dateClose(d)),
    saveBundles: (bundles, d) => dispatch(saveBundles(bundles, d)),
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<NotebookDate_Props>
) => {
  let dateState = state.dates[ownProps.date_id];
  return {
    date: dateState.date,
    events: dateState.events,
    isOpen: dateState.isOpen,
    bundles: dateState.bundles,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NotebookEventDate);
