import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import * as R from 'ramda';
import { createRefetchContainer } from 'react-relay';
import graphql from 'babel-plugin-relay/macro';
import withTheme from '@mui/styles/withTheme';
import withStyles from '@mui/styles/withStyles';
import { Link } from 'react-router-dom';
import inject18n from '../../../../components/i18n';
import { attackPatternsLinesQuery } from './AttackPatternsLines';
import { computeLevel } from '../../../../utils/Number';
import AttackPtternsMatrixBar from './AttackPtternsMatrixBar';
import { truncate } from '../../../../utils/String';

const styles = (theme) => ({
  container: {
    margin: '15px 0 -24px 0',
    overflow: 'scroll',
    whiteSpace: 'nowrap',
    paddingBottom: 20,
    minWidth: 'calc(100vw - 243px)',
    minHeight: 'calc(100vh - 205px)',
    width: 'calc(100vw - 243px)',
    height: 'calc(100vh - 205px)',
    maxWidth: 'calc(100vw - 243px)',
    maxHeight: 'calc(100vh - 205px)',
  },
  containerWithMarginRight: {
    margin: '15px 0 -24px 0',
    overflow: 'scroll',
    whiteSpace: 'nowrap',
    paddingBottom: 20,
    minWidth: 'calc(100vw - 430px)',
    minHeight: 'calc(100vh - 235px)',
    width: 'calc(100vw - 430px)',
    height: 'calc(100vh - 235px)',
    maxWidth: 'calc(100vw - 430px)',
    maxHeight: 'calc(100vh - 235px)',
  },
  header: {
    borderBottom: theme.palette.divider,
    marginBottom: 10,
  },
  headerElement: {
    display: 'inline-block',
    textAlign: 'center',
    width: 150,
    verticalAlign: 'top',
    margin: '0 5px 0 5px',
  },
  title: {
    margin: '0 auto',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 11,
  },
  column: {
    display: 'inline-block',
    width: 150,
    verticalAlign: 'top',
    margin: '0 5px 0 5px',
  },
  element: {
    color: theme.palette.text.primary,
    padding: 10,
    width: '100%',
    whiteSpace: 'normal',
    backgroundColor: theme.palette.background.paper,
    verticalAlign: 'top',
    cursor: 'pointer',
  },
  name: {
    fontSize: 10,
    fontWeight: 400,
  },
});

const colors = (defaultColor) => [
  [defaultColor, 'transparent', 'rgba(255,255,255,0.1)'],
  ['#ffffff', 'rgba(255,255,255,0.2)'],
  ['#fff59d', 'rgba(255,245,157,0.2)'],
  ['#ffe082', 'rgba(255,224,130,0.2)'],
  ['#ffb300', 'rgba(255,179,0,0.2)'],
  ['#ffb74d', 'rgba(255,183,77,0.2)'],
  ['#fb8c00', 'rgba(251,140,0,0.2)'],
  ['#d95f00', 'rgba(217,95,0,0.2)'],
  ['#e64a19', 'rgba(230,74,25,0.2)'],
  ['#f44336', 'rgba(244,67,54,0.2)'],
  ['#d32f2f', 'rgba(211,47,47,0.2)'],
  ['#b71c1c', 'rgba(183,28,28,0.2)'],
];

const colorsReversed = (defaultColor) => [
  [defaultColor, 'transparent', 'rgba(255,255,255,0.1)'],
  ['#ffffff', 'rgba(255,255,255,0.2)'],
  ['#c5e1a5', 'rgba(197,225,165,0.2)'],
  ['#aed581', 'rgba(174,213,129,0.2)'],
  ['#9ccc65', 'rgba(156,204,101,0.2)'],
  ['#8bc34a', 'rgba(139,195,74,0.2)'],
  ['#66bb6a', 'rgba(102,187,106,0.2)'],
  ['#4caf50', 'rgba(76,175,80,0.2)'],
  ['#43a047', 'rgba(67,160,71,0.2)'],
  ['#388e3c', 'rgba(56,142,60,0.2)'],
  ['#2e7d32', 'rgba(46,125,50,0.2)'],
  ['#1b5e20', 'rgba(27,94,32,0.2)'],
];

class AttackPatternsMatrixColumnsComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentModeOnlyActive: false,
      currentColorsReversed: false,
      currentKillChain: 'mitre-attack',
      hover: {},
    };
  }

  handleToggleHover(elementId) {
    const { hover } = this.state;
    hover[elementId] = hover[elementId] !== true;
    this.setState({ hover });
  }

  handleToggleModeOnlyActive() {
    this.setState({ currentModeOnlyActive: !this.state.currentModeOnlyActive });
  }

  handleToggleColorsReversed() {
    this.setState({ currentColorsReversed: !this.state.currentColorsReversed });
  }

  handleChangeKillChain(event) {
    const { value } = event.target;
    this.setState({ currentKillChain: value });
  }

  level(attackPattern, maxNumberOfSameAttackPattern) {
    const { attackPatterns } = this.props;
    const numberOfCorrespondingAttackPatterns = R.filter(
      (n) => n.id === attackPattern.id
        || (attackPattern.subAttackPatternsIds
          && R.includes(n.id, attackPattern.subAttackPatternsIds)),
      attackPatterns,
    ).length;
    return computeLevel(
      numberOfCorrespondingAttackPatterns,
      0,
      maxNumberOfSameAttackPattern,
      0,
      10,
    );
  }

  render() {
    const {
      t,
      data,
      classes,
      theme,
      attackPatterns: selectedPatterns,
      marginRight,
      searchTerm,
      handleChangeKillChain,
      handleToggleModeOnlyActive,
      handleToggleColorsReversed,
      currentKillChain,
      currentColorsReversed,
      currentModeOnlyActive,
    } = this.props;
    const { hover } = this.state;
    let changeKillChain = handleChangeKillChain;
    if (typeof changeKillChain !== 'function') {
      changeKillChain = this.handleChangeKillChain;
    }
    let toggleModeOnlyActive = handleToggleModeOnlyActive;
    if (typeof toggleModeOnlyActive !== 'function') {
      toggleModeOnlyActive = this.handleToggleModeOnlyActive;
    }
    let toggleColorsReversed = handleToggleColorsReversed;
    if (typeof toggleColorsReversed !== 'function') {
      toggleColorsReversed = this.handleToggleColorsReversed;
    }
    let killChain = currentKillChain;
    if (R.isNil(killChain)) {
      killChain = this.state.currentKillChain;
    }
    let modeOnlyActive = currentModeOnlyActive;
    if (R.isNil(modeOnlyActive)) {
      modeOnlyActive = this.state.currentModeOnlyActive;
    }
    let modeColorsReversed = currentColorsReversed;
    if (R.isNil(modeColorsReversed)) {
      modeColorsReversed = this.state.currentColorsReversed;
    }
    const sortByOrder = R.sortBy(R.prop('x_opencti_order'));
    const sortByName = R.sortBy(R.prop('name'));
    const filterByKeyword = (n) => searchTerm === ''
      || n.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1
      || n.description.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1
      || R.propOr('', 'x_mitre_id', n)
        .toLowerCase()
        .indexOf(searchTerm.toLowerCase()) !== -1
      || R.propOr('', 'subattackPatterns_text', n)
        .toLowerCase()
        .indexOf(searchTerm.toLowerCase()) !== -1;
    const maxNumberOfSameAttackPattern = Math.max(
      ...R.pipe(
        R.map((n) => [
          n,
          ...R.map((o) => o.node, n.parentAttackPatterns.edges),
        ]),
        R.flatten,
        R.countBy(R.prop('id')),
        R.values,
      )(selectedPatterns),
    );
    const filterSubattackPattern = (n) => n.isSubAttackPattern === false;
    const attackPatterns = R.pipe(
      R.map((n) => ({
        ...n.node,
        subAttackPatternsIds: R.map(
          (o) => o.node.id,
          n.node.subAttackPatterns.edges,
        ),
      })),
      R.map((n) => ({
        ...n,
        level: this.level(n, maxNumberOfSameAttackPattern),
        subattackPatterns_text: R.pipe(
          R.map(
            (o) => `${o.node.x_mitre_id} ${o.node.name} ${o.node.description}`,
          ),
          R.join(' | '),
        )(R.pathOr([], ['subAttackPatterns', 'edges'], n)),
        subAttackPatterns: R.pipe(
          R.map((o) => R.assoc(
            'level',
            this.level(o.node, maxNumberOfSameAttackPattern),
            o.node,
          )),
          sortByName,
        )(n.subAttackPatterns.edges),
        killChainPhasesIds: R.map((o) => o.node.id, n.killChainPhases.edges),
      })),
      R.filter(filterSubattackPattern),
      R.filter(filterByKeyword),
      R.filter((o) => (modeOnlyActive ? o.level > 0 : o.level >= 0)),
    )(data.attackPatterns.edges);
    const killChainPhases = R.pipe(
      R.map((n) => R.map((o) => o.node, n.node.killChainPhases.edges)),
      R.flatten,
      R.uniq,
      R.filter((n) => n.kill_chain_name === killChain),
      sortByOrder,
    )(data.attackPatterns.edges);
    const killChains = R.uniq([
      'mitre-attack',
      ...R.pipe(
        R.map((n) => R.map((o) => o.node, n.node.killChainPhases.edges)),
        R.flatten,
        R.map((n) => n.kill_chain_name),
      )(data.attackPatterns.edges),
    ]);
    const attackPatternsOfPhases = R.map(
      (n) => ({
        ...n,
        attackPatterns: R.pipe(
          R.filter((o) => R.includes(n.id, o.killChainPhasesIds)),
          sortByName,
        )(attackPatterns),
      }),
      killChainPhases,
    );
    return (
      <div
        className={
          marginRight ? classes.containerWithMarginRight : classes.container
        }
      >
        <AttackPtternsMatrixBar
          currentModeOnlyActive={modeOnlyActive}
          handleToggleModeOnlyActive={toggleModeOnlyActive.bind(this)}
          currentColorsReversed={modeColorsReversed}
          handleToggleColorsReversed={toggleColorsReversed.bind(this)}
          currentKillChain={killChain}
          handleChangeKillChain={changeKillChain.bind(this)}
          killChains={killChains}
        />
        <div
          id="container"
          style={{ width: attackPatternsOfPhases.length * 161 }}
        >
          <div className={classes.header}>
            {attackPatternsOfPhases.map((k) => (
              <div key={k.id} className={classes.headerElement}>
                <div className={classes.title}>
                  {truncate(k.phase_name, 18)}
                </div>
                <span className={classes.subtitle}>{`${
                  k.attackPatterns.length
                } ${t('techniques')}`}</span>
              </div>
            ))}
          </div>
          <div className={classes.body}>
            {attackPatternsOfPhases.map((k) => (
              <div key={k.id} className={classes.column}>
                {k.attackPatterns.map((a) => {
                  const isHover = hover[a.id] === true;
                  const level = isHover && a.level !== 0 ? a.level - 1 : a.level;
                  const position = isHover && level === 0 ? 2 : 1;
                  return (
                    <Link
                      key={a.id}
                      to={`/dashboard/arsenal/attack_patterns/${a.id}`}
                    >
                      <div
                        className={classes.element}
                        style={{
                          border: `1px solid ${
                            modeColorsReversed
                              ? colorsReversed(theme.palette.background.chip)[
                                level
                              ][0]
                              : colors(theme.palette.background.chip)[level][0]
                          }`,
                          backgroundColor: modeColorsReversed
                            ? colorsReversed(theme.palette.background.chip)[
                              level
                            ][position]
                            : colors(theme.palette.background.chip)[level][
                              position
                            ],
                        }}
                        onMouseEnter={this.handleToggleHover.bind(this, a.id)}
                        onMouseLeave={this.handleToggleHover.bind(this, a.id)}
                      >
                        <div className={classes.name}>{a.name}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

AttackPatternsMatrixColumnsComponent.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
  fld: PropTypes.func,
  attackPatterns: PropTypes.array,
  marginRight: PropTypes.bool,
  searchTerm: PropTypes.string,
  handleChangeKillChain: PropTypes.func,
  handleToggleModeOnlyActive: PropTypes.func,
  handleToggleColorsReversed: PropTypes.func,
  currentKillChain: PropTypes.bool,
  currentColorsReversed: PropTypes.bool,
  currentModeOnlyActive: PropTypes.bool,
};

export const attackPatternsMatrixColumnsQuery = graphql`
  query AttackPatternsMatrixColumnsQuery(
    $orderBy: AttackPatternsOrdering
    $orderMode: OrderingMode
    $count: Int!
    $cursor: ID
    $filters: [AttackPatternsFiltering]
  ) {
    ...AttackPatternsMatrixColumns_data
      @arguments(
        orderBy: $orderBy
        orderMode: $orderMode
        count: $count
        cursor: $cursor
        filters: $filters
      )
  }
`;

const AttackPatternsMatrixColumns = createRefetchContainer(
  AttackPatternsMatrixColumnsComponent,
  {
    data: graphql`
      fragment AttackPatternsMatrixColumns_data on Query
      @argumentDefinitions(
        orderBy: { type: "AttackPatternsOrdering", defaultValue: x_mitre_id }
        orderMode: { type: "OrderingMode", defaultValue: asc }
        count: { type: "Int", defaultValue: 25 }
        cursor: { type: "ID" }
        filters: { type: "[AttackPatternsFiltering]" }
      ) {
        attackPatterns(
          orderBy: $orderBy
          orderMode: $orderMode
          first: $count
          after: $cursor
          filters: $filters
        ) {
          edges {
            node {
              id
              name
              description
              isSubAttackPattern
              x_mitre_id
              subAttackPatterns {
                edges {
                  node {
                    id
                    name
                    description
                    x_mitre_id
                  }
                }
              }
              killChainPhases {
                edges {
                  node {
                    id
                    kill_chain_name
                    phase_name
                    x_opencti_order
                  }
                }
              }
            }
          }
        }
      }
    `,
  },
  attackPatternsLinesQuery,
);

export default R.compose(
  inject18n,
  withTheme,
  withStyles(styles),
)(AttackPatternsMatrixColumns);
