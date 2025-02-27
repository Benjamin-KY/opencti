import React, { Component } from 'react';
import PropTypes from 'prop-types';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import { compose } from 'ramda';
import withStyles from '@mui/styles/withStyles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { Close } from '@mui/icons-material';
import inject18n from '../../../../components/i18n';
import { SubscriptionAvatars } from '../../../../components/Subscription';
import OrganizationEditionOverview from './OrganizationEditionOverview';

const styles = (theme) => ({
  header: {
    backgroundColor: theme.palette.navAlt.backgroundHeader,
    color: theme.palette.navAlt.backgroundHeaderText,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
    color: 'inherit',
  },
  importButton: {
    position: 'absolute',
    top: 15,
    right: 20,
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
  appBar: {
    width: '100%',
    zIndex: theme.zIndex.drawer + 1,
    borderBottom: '1px solid #5c5c5c',
  },
  title: {
    float: 'left',
  },
});

class OrganizationEditionContainer extends Component {
  render() {
    const { t, classes, handleClose, organization } = this.props;
    const { editContext } = organization;
    return (
      <div>
        <div className={classes.header}>
          <IconButton
            aria-label="Close"
            className={classes.closeButton}
            onClick={handleClose.bind(this)}
            size="large"
          >
            <Close fontSize="small" />
          </IconButton>
          <Typography variant="h6" classes={{ root: classes.title }}>
            {t('Update an organization')}
          </Typography>
          <SubscriptionAvatars context={editContext} />
          <div className="clearfix" />
        </div>
        <div className={classes.container}>
          <OrganizationEditionOverview
            organization={this.props.organization}
            enableReferences={this.props.enableReferences}
            context={editContext}
            handleClose={handleClose.bind(this)}
          />
        </div>
      </div>
    );
  }
}

OrganizationEditionContainer.propTypes = {
  handleClose: PropTypes.func,
  classes: PropTypes.object,
  organization: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
};

const OrganizationEditionFragment = createFragmentContainer(
  OrganizationEditionContainer,
  {
    organization: graphql`
      fragment OrganizationEditionContainer_organization on Organization {
        id
        ...OrganizationEditionOverview_organization
        editContext {
          name
          focusOn
        }
      }
    `,
  },
);

export default compose(
  inject18n,
  withStyles(styles, { withTheme: true }),
)(OrganizationEditionFragment);
