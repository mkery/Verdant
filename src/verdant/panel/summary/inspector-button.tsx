import * as React from "react";
import { connect } from "react-redux";
import { inspectOff, inspectOn, verdantState } from "../../redux/index";

const INSPECTOR_BUTTON = "v-VerdantPanel-inspectorButton";

class InspectButton extends React.Component<{
  active: boolean;
  off: () => void;
  on: () => void;
}> {
  render() {
    return (
      <div
        className={`${INSPECTOR_BUTTON} ${this.props.active ? "active" : ""}`}
        onClick={() => {
          if (this.props.active) this.props.off();
          else this.props.on();
        }}
      ></div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    on: () => dispatch(inspectOn()),
    off: () => dispatch(inspectOff())
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    active: state.inspectOn
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InspectButton);
