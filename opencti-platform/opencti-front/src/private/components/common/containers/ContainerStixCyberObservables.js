import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { append, compose, filter, propOr } from 'ramda';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import withStyles from '@mui/styles/withStyles';
import * as R from 'ramda';
import { QueryRenderer } from '../../../../relay/environment';
import ListLines from '../../../../components/list_lines/ListLines';
import ContainerStixCyberObservablesLines, {
  containerStixCyberObservablesLinesQuery,
} from './ContainerStixCyberObservablesLines';
import {
  buildViewParamsFromUrlAndStorage,
  saveViewParameters,
} from '../../../../utils/ListParameters';
import inject18n from '../../../../components/i18n';
import StixCyberObservablesRightBar from '../../observations/stix_cyber_observables/StixCyberObservablesRightBar';
import ToolBar from '../../data/ToolBar';
import { defaultValue } from '../../../../utils/Graph';
import { UserContext } from '../../../../utils/Security';

const styles = () => ({
  container: {
    margin: '20px 0 0 0',
    padding: '0 260px 90px 0',
  },
});

class ContainerStixCyberObservablesComponent extends Component {
  constructor(props) {
    super(props);
    const params = buildViewParamsFromUrlAndStorage(
      props.history,
      props.location,
      `view-container-${props.container.id}-stix-observables`,
    );
    this.state = {
      sortBy: propOr('created_at', 'sortBy', params),
      orderAsc: propOr(false, 'orderAsc', params),
      searchTerm: propOr('', 'searchTerm', params),
      types: [],
      openExports: false,
      numberOfElements: { number: 0, symbol: '' },
      selectedElements: null,
      selectAll: false,
    };
  }

  saveView() {
    saveViewParameters(
      this.props.history,
      this.props.location,
      `view-container-${this.props.container.id}-stix-observables`,
      this.state,
    );
  }

  handleSearch(value) {
    this.setState({ searchTerm: value }, () => this.saveView());
  }

  handleSort(field, orderAsc) {
    this.setState({ sortBy: field, orderAsc }, () => this.saveView());
  }

  handleToggleExports() {
    this.setState({ openExports: !this.state.openExports });
  }

  handleToggle(type) {
    if (this.state.types.includes(type)) {
      this.setState(
        { types: filter((t) => t !== type, this.state.types) },
        () => this.saveView(),
      );
    } else {
      this.setState({ types: append(type, this.state.types) }, () => this.saveView());
    }
  }

  handleClear() {
    this.setState({ types: [] }, () => this.saveView());
  }

  handleToggleSelectEntity(entity, event) {
    event.stopPropagation();
    event.preventDefault();
    const { selectedElements } = this.state;
    if (entity.id in (selectedElements || {})) {
      const newSelectedElements = R.omit([entity.id], selectedElements);
      this.setState({
        selectAll: false,
        selectedElements: newSelectedElements,
      });
    } else {
      const newSelectedElements = R.assoc(
        entity.id,
        entity,
        selectedElements || {},
      );
      this.setState({
        selectAll: false,
        selectedElements: newSelectedElements,
      });
    }
  }

  handleToggleSelectAll() {
    this.setState({ selectAll: !this.state.selectAll, selectedElements: null });
  }

  handleClearSelectedElements() {
    this.setState({ selectAll: false, selectedElements: null });
  }

  setNumberOfElements(numberOfElements) {
    this.setState({ numberOfElements });
  }

  // eslint-disable-next-line class-methods-use-this
  buildColumns(helper) {
    const isRuntimeSort = helper.isRuntimeFieldEnable();
    return {
      entity_type: {
        label: 'Type',
        width: '15%',
        isSortable: true,
      },
      observable_value: {
        label: 'Value',
        width: '40%',
        isSortable: isRuntimeSort,
      },
      createdBy: {
        label: 'Creator',
        width: '15%',
        isSortable: isRuntimeSort,
      },
      created_at: {
        label: 'Creation date',
        width: '15%',
        isSortable: true,
      },
      objectMarking: {
        label: 'Marking',
        isSortable: isRuntimeSort,
      },
    };
  }

  render() {
    const { container, classes } = this.props;
    const {
      sortBy,
      orderAsc,
      searchTerm,
      openExports,
      numberOfElements,
      selectedElements,
      selectAll,
      types,
    } = this.state;

    const paginationOptions = {
      types: types.length > 0 ? types : ['Stix-Cyber-Observable'],
      search: searchTerm,
      orderBy: sortBy,
      orderMode: orderAsc ? 'asc' : 'desc',
    };
    const exportPaginationOptions = {
      filters: [
        { key: 'containedBy', values: [container.id] },
        {
          key: 'entity_type',
          values: types.length > 0 ? types : ['Stix-Cyber-Observable'],
        },
      ],
      orderBy: sortBy,
      orderMode: orderAsc ? 'asc' : 'desc',
      search: searchTerm,
    };
    let numberOfSelectedElements = Object.keys(selectedElements || {}).length;
    if (selectAll) {
      numberOfSelectedElements = numberOfElements.original;
    }
    const finalFilters = {
      entity_type:
        types.length > 0
          ? R.map((n) => ({ id: n, value: n }), types)
          : [{ id: 'Stix-Cyber-Observable', value: 'Stix-Cyber-Observable' }],
      containedBy: [{ id: container.id, value: defaultValue(container) }],
    };
    return (
      <UserContext.Consumer>
        {({ helper }) => (
          <div className={classes.container}>
            <ListLines
              sortBy={sortBy}
              orderAsc={orderAsc}
              dataColumns={this.buildColumns(helper)}
              handleSort={this.handleSort.bind(this)}
              handleSearch={this.handleSearch.bind(this)}
              secondaryAction={true}
              numberOfElements={numberOfElements}
              handleToggleSelectAll={this.handleToggleSelectAll.bind(this)}
              selectAll={selectAll}
              iconExtension={true}
              handleToggleExports={this.handleToggleExports.bind(this)}
              exportEntityType="Stix-Cyber-Observable"
              openExports={openExports}
              exportContext={`of-container-${container.id}`}
              paginationOptions={exportPaginationOptions}
            >
              <QueryRenderer
                query={containerStixCyberObservablesLinesQuery}
                variables={{
                  id: container.id,
                  count: 25,
                  ...paginationOptions,
                }}
                render={({ props }) => (
                  <ContainerStixCyberObservablesLines
                    container={props ? props.container : null}
                    paginationOptions={paginationOptions}
                    dataColumns={this.buildColumns(helper)}
                    initialLoading={props === null}
                    setNumberOfElements={this.setNumberOfElements.bind(this)}
                    onTypesChange={this.handleToggle.bind(this)}
                    openExports={openExports}
                    selectedElements={selectedElements}
                    onToggleEntity={this.handleToggleSelectEntity.bind(this)}
                    selectAll={selectAll}
                  />
                )}
              />
            </ListLines>
            <ToolBar
              selectedElements={selectedElements}
              numberOfSelectedElements={numberOfSelectedElements}
              selectAll={selectAll}
              search={searchTerm}
              filters={finalFilters}
              handleClearSelectedElements={this.handleClearSelectedElements.bind(
                this,
              )}
              withPaddingRight={true}
            />
            <StixCyberObservablesRightBar
              types={types}
              handleToggle={this.handleToggle.bind(this)}
              handleClear={this.handleClear.bind(this)}
              openExports={openExports}
            />
          </div>
        )}
      </UserContext.Consumer>
    );
  }
}

ContainerStixCyberObservablesComponent.propTypes = {
  container: PropTypes.object,
  classes: PropTypes.object,
  t: PropTypes.func,
  fd: PropTypes.func,
  history: PropTypes.object,
};

const ContainerStixCyberObservables = createFragmentContainer(
  ContainerStixCyberObservablesComponent,
  {
    container: graphql`
      fragment ContainerStixCyberObservables_container on Container {
        id
        ... on Report {
          name
        }
        ... on Note {
          attribute_abstract
          content
        }
        ... on Opinion {
          opinion
        }
        ... on ObservedData {
          name
          first_observed
          last_observed
        }
        ...ContainerHeader_container
      }
    `,
  },
);

export default compose(
  inject18n,
  withStyles(styles),
)(ContainerStixCyberObservables);
