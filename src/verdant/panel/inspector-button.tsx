import * as React from "react";
import { connect } from "react-redux";
import { inspectOff, inspectOn, verdantState } from "../redux/index";
import { InspectIcon } from "../icons/";

class InspectButton extends React.Component<{
  active: boolean;
  off: () => void;
  on: () => void;
}> {
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
  return {
    on: () => dispatch(inspectOn()),
    off: () => dispatch(inspectOff()),
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    active: state.inspectOn,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(InspectButton);
