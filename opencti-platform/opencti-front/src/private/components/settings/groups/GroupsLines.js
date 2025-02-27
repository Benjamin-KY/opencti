import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { createPaginationContainer } from 'react-relay';
import graphql from 'babel-plugin-relay/macro';
import { pathOr } from 'ramda';
import ListLinesContent from '../../../../components/list_lines/ListLinesContent';
import { GroupLine, GroupLineDummy } from './GroupLine';

const nbOfRowsToLoad = 50;

class GroupsLines extends Component {
  render() {
    const { initialLoading, dataColumns, relay, paginationOptions } = this.props;
    return (
      <ListLinesContent
        initialLoading={initialLoading}
        loadMore={relay.loadMore.bind(this)}
        hasMore={relay.hasMore.bind(this)}
        isLoading={relay.isLoading.bind(this)}
        dataList={pathOr([], ['groups', 'edges'], this.props.data)}
        globalCount={pathOr(
          nbOfRowsToLoad,
          ['groups', 'pageInfo', 'globalCount'],
          this.props.data,
        )}
        LineComponent={<GroupLine />}
        DummyLineComponent={<GroupLineDummy />}
        dataColumns={dataColumns}
        nbOfRowsToLoad={nbOfRowsToLoad}
        paginationOptions={paginationOptions}
      />
    );
  }
}

GroupsLines.propTypes = {
  classes: PropTypes.object,
  paginationOptions: PropTypes.object,
  dataColumns: PropTypes.object.isRequired,
  data: PropTypes.object,
  relay: PropTypes.object,
  groups: PropTypes.object,
  initialLoading: PropTypes.bool,
};

export const groupsLinesQuery = graphql`
  query GroupsLinesPaginationQuery(
    $search: String
    $count: Int!
    $cursor: ID
    $orderBy: GroupsOrdering
    $orderMode: OrderingMode
  ) {
    ...GroupsLines_data
      @arguments(
        search: $search
        count: $count
        cursor: $cursor
        orderBy: $orderBy
        orderMode: $orderMode
      )
  }
`;

export default createPaginationContainer(
  GroupsLines,
  {
    data: graphql`
      fragment GroupsLines_data on Query
      @argumentDefinitions(
        search: { type: "String" }
        count: { type: "Int", defaultValue: 25 }
        cursor: { type: "ID" }
        orderBy: { type: "GroupsOrdering", defaultValue: name }
        orderMode: { type: "OrderingMode", defaultValue: asc }
      ) {
        groups(
          search: $search
          first: $count
          after: $cursor
          orderBy: $orderBy
          orderMode: $orderMode
        ) @connection(key: "Pagination_groups") {
          edges {
            node {
              ...GroupLine_node
            }
          }
          pageInfo {
            endCursor
            hasNextPage
            globalCount
          }
        }
      }
    `,
  },
  {
    direction: 'forward',
    getConnectionFromProps(props) {
      return props.data && props.data.groups;
    },
    getFragmentVariables(prevVars, totalCount) {
      return {
        ...prevVars,
        count: totalCount,
      };
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        search: fragmentVariables.search,
        count,
        cursor,
        orderBy: fragmentVariables.orderBy,
        orderMode: fragmentVariables.orderMode,
      };
    },
    query: groupsLinesQuery,
  },
);
