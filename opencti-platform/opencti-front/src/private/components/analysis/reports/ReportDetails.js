import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { compose } from 'ramda';
import { createFragmentContainer } from 'react-relay';
import graphql from 'babel-plugin-relay/macro';
import withStyles from '@mui/styles/withStyles';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import inject18n from '../../../../components/i18n';
import ItemStatus from '../../../../components/ItemStatus';
import EntityStixCoreRelationshipsDonut from '../../common/stix_core_relationships/EntityStixCoreRelationshipsDonut';
import ExpandableMarkdown from '../../../../components/ExpandableMarkdown';

const styles = (theme) => ({
  paper: {
    height: '100%',
    minHeight: '100%',
    margin: '10px 0 0 0',
    padding: '15px',
    borderRadius: 6,
  },
  chip: {
    fontSize: 12,
    lineHeight: '12px',
    backgroundColor: theme.palette.background.chip,
    color: '#ffffff',
    textTransform: 'uppercase',
    borderRadius: '0',
    margin: '0 5px 5px 0',
  },
});

class ReportDetailsComponent extends Component {
  render() {
    const { t, classes, report } = this.props;
    return (
      <div style={{ height: '100%' }}>
        <Typography variant="h4" gutterBottom={true}>
          {t('Entity details')}
        </Typography>
        <Paper classes={{ root: classes.paper }} elevation={2}>
          <Grid container={true} spacing={3}>
            <Grid item={true} xs={8}>
              <Typography variant="h3" gutterBottom={true}>
                {t('Description')}
              </Typography>
              <ExpandableMarkdown source={report.description} limit={400} />
            </Grid>
            <Grid item={true} xs={4}>
              <Typography variant="h3" gutterBottom={true}>
                {t('Report types')}
              </Typography>
              {report.report_types?.map((reportType) => (
                <Chip
                  key={reportType}
                  classes={{ root: classes.chip }}
                  label={reportType}
                />
              ))}
              <Typography
                variant="h3"
                gutterBottom={true}
                style={{ marginTop: 20 }}
              >
                {t('Processing status')}
              </Typography>
              <ItemStatus
                status={report.status}
                disabled={!report.workflowEnabled}
              />
            </Grid>
          </Grid>
          <EntityStixCoreRelationshipsDonut
            variant="inEntity"
            entityId={report.id}
            toTypes={['Stix-Core-Object']}
            relationshipType="object"
            field="entity_type"
            height={290}
          />
        </Paper>
      </div>
    );
  }
}

ReportDetailsComponent.propTypes = {
  report: PropTypes.object,
  classes: PropTypes.object,
  t: PropTypes.func,
  fld: PropTypes.func,
};

const ReportDetails = createFragmentContainer(ReportDetailsComponent, {
  report: graphql`
    fragment ReportDetails_report on Report {
      id
      report_types
      description
      status {
        id
        order
        template {
          name
          color
        }
      }
      workflowEnabled
    }
  `,
});

export default compose(inject18n, withStyles(styles))(ReportDetails);
