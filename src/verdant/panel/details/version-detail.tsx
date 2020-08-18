import * as React from "react";
import { Nodey } from "../../../lilgit/nodey/";
import { History } from "../../../lilgit/history/";
import { VersionSampler } from "../../sampler/version-sampler";
import { SAMPLE_TYPE, Sampler } from "../../../lilgit/sampler";
import VersionHeader from "./version-header";
import { verdantState } from "../../redux/";
import { connect } from "react-redux";

export type Version_Props = {
  history: History;
  nodey: Nodey;
  no_header: boolean;
};

class VersionDetail extends React.Component<Version_Props, { sample: string }> {
  constructor(props: Version_Props) {
    super(props);
    this.state = {
      sample: "",
    };
  }

  componentDidMount() {
    this.getSample();
  }

  componentDidUpdate(prevProps: Version_Props) {
    if (this.props.nodey.name != prevProps.nodey.name) this.getSample();
  }

  render() {
    return (
      <div className="v-VerdantPanel-details-version">
        {this.showHeader()}
        <div
          className="v-VerdantPanel-details-version-sample"
          dangerouslySetInnerHTML={{ __html: this.state.sample }}
        ></div>
      </div>
    );
  }

  showHeader() {
    if (!this.props.no_header)
      return <VersionHeader nodey={this.props.nodey} />;
    return null;
  }

  async getSample() {
    await this.props.history.ready;
    let prior = this.props.history.store.getPriorVersion(this.props.nodey);
    let s: HTMLDivElement;
    if (prior != null) {
      s = await VersionSampler.sample(
        SAMPLE_TYPE.DIFF,
        this.props.history,
        this.props.nodey,
        null,
        Sampler.CHANGE_DIFF,
        prior.name
      );
    } else {
      s = await VersionSampler.sample(
        SAMPLE_TYPE.ARTIFACT,
        this.props.history,
        this.props.nodey
      );
    }
    this.setState({ sample: s.outerHTML });
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<Version_Props>
) => {
  return {
    history: state.getHistory(),
    no_header: ownProps.no_header,
  };
};

export default connect(mapStateToProps, null)(VersionDetail);
