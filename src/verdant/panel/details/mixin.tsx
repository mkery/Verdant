import * as React from "react";
import {
  Nodey,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyOutput
} from "../../../lilgit/model/nodey";
import {History} from "../../../lilgit/model/history";
import VersionHeader from "../../sampler/version-header";
import {VersionSampler} from "../../sampler/version-sampler";
import {SAMPLE_TYPE, Sampler} from "../../../lilgit/model/sampler";

const HEADER = "v-VerdantPanel-crumbMenu";
const CRUMB_MENU_CONTENT = "v-VerdantPanel-sampler-content";
const HEADER_TARGET = "v-VerdantPanel-crumbMenu-item";
//const HEADER_WISK = "v-VerdantPanel-mixin-mixButton";
const CRUMB_MENU_SEPERATOR = "v-VerdantPanel-crumbMenu-seperator";

type Mixin_Props = {
  history: History;
  target: Nodey;
  notebookLink: (ver: number) => void;
  headerShowing: boolean;
};

type Mixin_State = {
  target_name: string;
  samples: string[];
};

export class Mixin extends React.Component<Mixin_Props, Mixin_State> {
  constructor(props: Mixin_Props) {
    super(props);
    this.state = {
      target_name: Mixin.nameNodey(this.props.target),
      samples: []
    };
  }

  componentDidMount() {
    this.getSamples(); // render the source code
  }

  render() {
    return (
      <div>
        {this.showHeader()}
        <ul className={CRUMB_MENU_CONTENT}>{this.showDetails()}</ul>
      </div>
    );
  }

  showHeader() {
    if (this.props.headerShowing)
      return (
        <div className={HEADER}>
          <div className={HEADER_TARGET}>{this.state.target_name}</div>
        </div>
      );
    return null;
  }

  showDetails() {
    let target = this.props.target;
    let history = this.props.history.store.getHistoryOf(target);

    let details = [];
    for (let i = history.versions.length - 1; i > -1; i--) {
      let nodeyVer = history.versions[i];
      let header = (
        <VersionHeader
          history={this.props.history}
          nodey={nodeyVer}
          notebookLink={this.props.notebookLink}
        />
      );
      let sample = null;
      if (this.state.samples[i]) {
        sample = (
          <div
            dangerouslySetInnerHTML={{ __html: this.state.samples[i] }}
          ></div>
        );
      }
      details.push(
        <div key={i}>
          {header}
          {sample}
        </div>
      );
    }
    return details;
  }

  async getSamples() {
    let history = this.props.history.store.getHistoryOf(this.props.target);
    let samples = await Promise.all(
      history.versions.map(async (nodeyVer, index) => {
        let prior = this.props.history.store.getPriorVersion(nodeyVer);
        let s;
        if (prior != null) {
          s = await VersionSampler.sample(SAMPLE_TYPE.DIFF, this.props.history, nodeyVer, null, Sampler.CHANGE_DIFF, prior.name);
        } else {
          s = await VersionSampler.sample(SAMPLE_TYPE.ARTIFACT, this.props.history, nodeyVer);
        }
        return s.outerHTML;
      })
    );
    this.setState({ samples: samples });
  }
}

export namespace Mixin {
  export function labelNodeyCode(target: NodeyCode, history: History) {
    let name = Mixin.nameNodey(target);
    if (target instanceof NodeyCodeCell) {
      return Mixin.addItem(name);
    } else {
      let cell = history.store.getCellParent(target);
      return [
        <div
          className={HEADER_TARGET}
          onClick={() => {
            history.inspector.target = cell;
          }}
        >{`cell ${cell.id}`}</div>,
        Mixin.addSeperator(),
        Mixin.addItem(name)
      ];
    }
  }

  export function addSeperator() {
    return <div className={CRUMB_MENU_SEPERATOR}>{">"}</div>;
  }

  export function addItem(label: string) {
    return <div className={HEADER_TARGET}>{label}</div>;
  }

  export function nameNodey(target: Nodey) {
    let name = "";
    if (target instanceof NodeyCode) {
      if (target instanceof NodeyCodeCell) name = "cell " + target.id;
      else name = target.type + " " + target.id;
    } else if (target instanceof NodeyMarkdown) name = "markdown " + target.id;
    else if (target instanceof NodeyOutput) name = "output " + target.id;
    return name;
  }

  export function labelOrigin(target: Nodey) {
    return (
      <div className={HEADER}>
        <div className={HEADER_TARGET}>
          {`${Mixin.nameNodey(target)} was created from:`}
        </div>
      </div>
    );
  }
}
