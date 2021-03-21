import * as React from "react";
import { connect } from "react-redux";
import { Checkpoint } from "../../../verdant-model/checkpoint";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons";
import { verdantState, dateOpen, dateClose, Bundles } from "../../redux";
import EventBundle from "./event-bundle";

/* CSS Constants */
const DATE_HEADER = `Verdant-events-date-header`;
const DATE_HEADER_LABEL = `${DATE_HEADER}-label`;
const DATE_HEADER_COLLAPSE = `${DATE_HEADER}-collapse`;

type req_NotebookDate_Props = { date_id: number };

type NotebookDate_Props = {
  // provided by redux store
  date: number;
  events: Checkpoint[];
  isOpen: boolean;
  open: (d: number) => void;
  close: (d: number) => void;
  bundles: Bundles.bundleState[];
  bundleCount: number;
} & req_NotebookDate_Props;

class DateSection extends React.Component<NotebookDate_Props, any> {
  private _isMounted = false;

  constructor(props: NotebookDate_Props) {
    super(props);
    this.state = { bundles: props.bundles };
  }
  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps) {
    if (this._isMounted && this.props.bundleCount !== prevProps.bundleCount) {
      this.setState({ bundles: this.props.bundles });
    }
  }

  render() {
    return (
      <div>
        <div
          className={DATE_HEADER}
          onClick={() => {
            if (this.props.isOpen) this.props.close(this.props.date_id);
            else this.props.open(this.props.date_id);
          }}
        >
          {this.showArrow()}
          <div className={DATE_HEADER_LABEL}>
            {Checkpoint.formatDate(this.props.date)}
          </div>
          <div className={DATE_HEADER_COLLAPSE}>
            <div>({this.props.events?.length})</div>
          </div>
        </div>
        <div>{this.props.isOpen ? this.makeBundles() : null}</div>
      </div>
    );
  }

  private showArrow() {
    if (this.props.isOpen) return <ChevronDownIcon />;
    return <ChevronRightIcon />;
  }

  private makeBundles() {
    // Creates bundle for each set of checkpoints
    return this.state.bundles.map((_, i) => (
      <EventBundle key={i} bundle_id={i} date_id={this.props.date_id} />
    ));
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d) => dispatch(dateOpen(d)),
    close: (d) => dispatch(dateClose(d)),
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: req_NotebookDate_Props
) => {
  let dateState = state.eventView?.dates[ownProps.date_id];
  return {
    date: dateState?.date,
    events: dateState?.events,
    isOpen: dateState?.isOpen,
    bundles: dateState?.bundles,
    bundleCount: dateState?.bundles?.length || 0,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DateSection);
