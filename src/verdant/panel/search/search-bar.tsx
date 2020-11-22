import * as React from "react";
import { SearchIcon, XIcon } from "../../icons";
import { searchForText, verdantState } from "../../redux/";
import { connect } from "react-redux";

type SearchBar_Props = {
  searchFor: (string) => void;
  searchQuery: string | null;
};

type SearchBar_State = {
  searchbox_text: string;
  show_x: boolean;
};

class SearchBar extends React.Component<SearchBar_Props, SearchBar_State> {
  constructor(props: SearchBar_Props) {
    super(props);
    this.state = {
      searchbox_text: props.searchQuery ? props.searchQuery : "",
      show_x: false,
    };
  }

  render() {
    return (
      <div
        className="v-VerdantPanel-searchContainer"
        onMouseEnter={() => this.setState({ show_x: true })}
        onMouseLeave={() => this.setState({ show_x: false })}
      >
        <SearchIcon />
        <input
          className="v-VerdantPanel-searchText"
          contentEditable={true}
          placeholder="search history by keyword"
          value={this.state.searchbox_text}
          onChange={(ev) => {
            this.setState({ searchbox_text: ev.target.value });
          }}
          onKeyDown={(ev) => {
            if (ev.keyCode === 13) {
              ev.preventDefault();
              ev.stopPropagation();
              this.props.searchFor(this.state.searchbox_text);
            }
          }}
        ></input>
        <div
          style={{
            position: "absolute",
            right: "16px",
            display: this.state.show_x ? "" : "none",
          }}
          onClick={() => {
            this.setState({ searchbox_text: "" });
            this.props.searchFor(null);
          }}
        >
          <XIcon />
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    searchFor: (text: string) => dispatch(searchForText(text)),
  };
};

const mapStateToProps = (state: verdantState) => {
  return {
    searchQuery: state.search.searchQuery,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
