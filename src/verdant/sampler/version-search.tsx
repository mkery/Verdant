import * as React from "react";
import {Nodey} from "../../lilgit/model/nodey";
import {History} from "../../lilgit/model/history";
import {VersionSampler} from "./version-sampler";
import VersionHeader from "./version-header";
import {Sampler} from "../../lilgit/model/sampler";
import SAMPLE_TYPE = VersionSampler.SAMPLE_TYPE;

const SEARCH_SAMPLE = "v-VerdantPanel-search-version";
const VERSION_HEADER = "v-VerdantPanel-sampler-version-header";
const SEARCH_VERSION_LABEL = "v-VerdantPanel-search-version-header";
const VERSION_LINK = "v-VerdantPanel-sampler-version-header-link";

type VersionSearch_Props = {
  history: History;
  nodey: Nodey[];
  query: string;
  callback: () => void;
  notebookLink: (ver: number) => void;
};

export default class VersionSearch extends React.Component<
  VersionSearch_Props,
  { samples: string[] }
> {
  constructor(props: VersionSearch_Props) {
    super(props);
    this.state = { samples: null };
  }

  componentDidMount() {
    // load samples for all versions of these nodes
    this.props.history.ready.then(async () => {
      let samples = await Promise.all(
        this.props.nodey.map(async item => {
          let div = await VersionSampler.sample(
            SAMPLE_TYPE.SEARCH,
            this.props.history,
            item,
            this.props.query,
            Sampler.NO_DIFF
          );
          return div.outerHTML;
        })
      );
      this.setState({ samples: samples });
    });
  }

  render() {
    return (
      <div>
        <div className={`${VERSION_HEADER} search`}>
          <div className={SEARCH_VERSION_LABEL}>
            <span>{`${this.props.nodey.length}  versions of `}</span>
            <span className={VERSION_LINK} onMouseDown={this.props.callback}>
              {VersionSampler.nameNodey(
                this.props.history,
                this.props.nodey[0]
              )}
            </span>
          </div>
        </div>
        <div>{this.showSamples()}</div>
      </div>
    );
  }

  showSamples() {
    if (this.state.samples)
      return this.props.nodey.map((item, index) => {
        let sample = this.state.samples[index];
        return (
          <div key={index}>
            <div className="searchVerLabel">
              <VersionHeader
                history={this.props.history}
                nodey={item}
                notebookLink={this.props.notebookLink}
              />
            </div>
            <div
              className={SEARCH_SAMPLE}
              dangerouslySetInnerHTML={{ __html: sample }}
            ></div>
          </div>
        );
      });
    return null;
  }
}
