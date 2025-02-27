import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { compose } from 'ramda';
import withStyles from '@mui/styles/withStyles';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import inject18n from '../../../components/i18n';

const styles = (theme) => ({
  button: {
    marginRight: theme.spacing(2),
    padding: '2px 5px 2px 5px',
    minHeight: 20,
    minWidth: 20,
    textTransform: 'none',
  },
  icon: {
    marginRight: theme.spacing(1),
  },
});

class TopMenuThreats extends Component {
  render() {
    const { t, classes } = this.props;
    return (
      <div>
        <Button
          component={Link}
          to="/dashboard/workspaces/dashboards"
          variant="contained"
          size="small"
          color="secondary"
          classes={{ root: classes.button }}
        >
          {t('Custom dashboards')}
        </Button>
      </div>
    );
  }
}

TopMenuThreats.propTypes = {
  classes: PropTypes.object,
  t: PropTypes.func,
};

export default compose(inject18n, withStyles(styles))(TopMenuThreats);
