import * as React from "react";
import { connect } from "react-redux";
import { inspectOff, inspectOn, verdantState } from "../../redux/index";

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 19 18"
            aria-labelledby="title"
            className="v-VerdantPanel-inspectorButton-icon"
          >
            <title id="title">Inspector Icon</title>
            <path d="M7 0a7 7 0 016.84 8.494l4.53 1.976a.67.67 0 01.028 1.223l-.098.037-3.69 1.12a.67.67 0 00-.374.284l-.046.086-1.55 3.53a.67.67 0 01-1.223.018l-.037-.098-1.052-3.51A7 7 0 117 0zm6.5 12.91c.167-.38.492-.67.89-.79l3.49-1.06-4.24-1.84-4.27-1.85L12 16.25zM7.504 3.5H6.497v3.625l-3.135.896.277.958 3.865-1.096V3.5z" />
          </svg>
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
