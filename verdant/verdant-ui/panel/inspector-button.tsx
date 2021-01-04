import * as React from "react";
import { connect } from "react-redux";
import { inspectOff, inspectOn, verdantState } from "../redux/";
import { InspectIcon } from "../icons/";

class InspectButton extends React.Component<{
  active: boolean;
  off: () => void;
  on: () => void;
}> {
  private _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps) {
    if (this._isMounted && !this.props.active && prevProps.active) {
      this.props.off();
    }
  }

  render() {
    return (
      <div
        className={`v-VerdantPanel-inspectorButton ${
          this.props.active ? "active" : ""
        }`}
        onClick={() => {
          if (this.props.active) this.props.off();
          else this.props.on();
        }}
      >
        <div className="v-VerdantPanel-inspectorButton-label">
          <span>Version Inspector</span>
          <InspectIcon />
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  const ev = () => dispatch(inspectOff());
  return {
    on: () => {
      dispatch(inspectOn());
      document.addEventListener("click", ev, { once: true });
    },
    off: () => {
      dispatch(inspectOff());
      document.removeEventListener("click", ev);
    },
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    active: state.artifactView.inspectOn,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InspectButton);
