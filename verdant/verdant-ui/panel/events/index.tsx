import * as React from "react";
import DateSection from "./date-section";
import { connect } from "react-redux";
import { verdantState, dateState } from "../../redux";

const PANEL = "v-VerdantPanel-content";

type EventColumn_Props = {
  ready: boolean;
  dates: dateState[];
  currentDate: number;
};

class EventColumn extends React.Component<
  EventColumn_Props,
  { dates: dateState[] }
> {
  constructor(props: EventColumn_Props) {
    super(props);

    // having both a state and props for dates seems weird
    // but trying to get view to actually update on a new date (it's not doing it correctly)
    this.state = { dates: [...this.props.dates] };
  }

  componentDidUpdate(priorProps: EventColumn_Props) {
    if (this.props.currentDate !== priorProps.currentDate) {
      this.setState({ dates: this.props.dates || [] });
    }
  }

  render() {
    if (this.props.ready) {
      return (
        <div className={PANEL}>
          {this.state.dates.map((_, index) => {
            let reverse = this.state.dates.length - 1 - index;
            return <DateSection key={reverse} date_id={reverse} />;
          })}
        </div>
      );
    } else return null; //TODO loading placeholder?
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    ready: state.eventView.ready,
    dates: state.eventView.dates,
    currentDate: state.eventView?.dates?.length - 1 || -1,
  };
};

export default connect(mapStateToProps, null)(EventColumn);
