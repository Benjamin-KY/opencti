import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import {
  compose,
  filter,
  flatten,
  fromPairs,
  includes,
  map,
  propOr,
  uniq,
  zip,
} from 'ramda';
import graphql from 'babel-plugin-relay/macro';
import withStyles from '@mui/styles/withStyles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Slide from '@mui/material/Slide';
import { Add } from '@mui/icons-material';
import { createFragmentContainer } from 'react-relay';
import { Form, Formik, Field } from 'formik';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import * as Yup from 'yup';
import Tooltip from '@mui/material/Tooltip';
import inject18n from '../../../../components/i18n';
import {
  commitMutation,
  MESSAGING$,
  QueryRenderer,
} from '../../../../relay/environment';
import { markingDefinitionsLinesSearchQuery } from '../../settings/marking_definitions/MarkingDefinitionsLines';
import SelectField from '../../../../components/SelectField';
import Loader from '../../../../components/Loader';

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));
Transition.displayName = 'TransitionSlide';

const styles = (theme) => ({
  createButton: {
    float: 'left',
  },
  drawerPaper: {
    minHeight: '100vh',
    width: 250,
    padding: '0 0 20px 0',
    position: 'fixed',
    backgroundColor: theme.palette.navAlt.background,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  listIcon: {
    marginRight: 0,
  },
  item: {
    padding: '0 0 0 10px',
  },
  itemField: {
    padding: '0 15px 0 15px',
  },
  toolbar: theme.mixins.toolbar,
});

export const StixDomainObjectsExportCreationMutation = graphql`
  mutation StixDomainObjectsExportCreationMutation(
    $type: String!
    $format: String!
    $exportType: String!
    $maxMarkingDefinition: String
    $context: String
    $search: String
    $orderBy: StixDomainObjectsOrdering
    $orderMode: OrderingMode
    $filters: [StixDomainObjectsFiltering]
  ) {
    stixDomainObjectsExportAsk(
      type: $type
      format: $format
      exportType: $exportType
      maxMarkingDefinition: $maxMarkingDefinition
      context: $context
      search: $search
      orderBy: $orderBy
      orderMode: $orderMode
      filters: $filters
    ) {
      edges {
        node {
          id
          name
          uploadStatus
          lastModifiedSinceMin
        }
      }
    }
  }
`;

const exportValidation = (t) => Yup.object().shape({
  format: Yup.string().required(t('This field is required')),
});

export const scopesConn = (exportConnectors) => {
  const scopes = uniq(flatten(map((c) => c.connector_scope, exportConnectors)));
  const connectors = map((s) => {
    const filteredConnectors = filter(
      (e) => includes(s, e.connector_scope),
      exportConnectors,
    );
    return map(
      (x) => ({ data: { name: x.name, active: x.active } }),
      filteredConnectors,
    );
  }, scopes);
  const zipped = zip(scopes, connectors);
  return fromPairs(zipped);
};

class StixDomainObjectsExportCreationComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
  }

  handleOpen() {
    this.setState({ open: true });
  }

  handleClose() {
    this.setState({ open: false });
  }

  onSubmit(values, { setSubmitting, resetForm }) {
    const { paginationOptions, context } = this.props;
    const maxMarkingDefinition = values.maxMarkingDefinition === 'none'
      ? null
      : values.maxMarkingDefinition;
    commitMutation({
      mutation: StixDomainObjectsExportCreationMutation,
      variables: {
        type: this.props.exportEntityType,
        format: values.format,
        exportType: 'full',
        maxMarkingDefinition,
        context,
        ...paginationOptions,
      },
      onCompleted: () => {
        setSubmitting(false);
        resetForm();
        if (this.props.onExportAsk) this.props.onExportAsk();
        this.handleClose();
        MESSAGING$.notifySuccess('Export successfully started');
      },
    });
  }

  render() {
    const { classes, t, data } = this.props;
    const connectorsExport = propOr([], 'connectorsForExport', data);
    const exportScopes = uniq(
      flatten(map((c) => c.connector_scope, connectorsExport)),
    );
    const exportConnsPerFormat = scopesConn(connectorsExport);
    // eslint-disable-next-line max-len
    const isExportActive = (format) => filter((x) => x.data.active, exportConnsPerFormat[format]).length > 0;
    const isExportPossible = filter((x) => isExportActive(x), exportScopes).length > 0;
    return (
      <div className={classes.createButton}>
        <Tooltip
          title={
            isExportPossible
              ? t('Generate an export')
              : t('No export connector available to generate an export')
          }
          aria-label="generate-export"
        >
          <span>
            <IconButton
              onClick={this.handleOpen.bind(this)}
              color="secondary"
              aria-label="Add"
              disabled={!isExportPossible}
              size="large"
            >
              <Add />
            </IconButton>
          </span>
        </Tooltip>
        <Formik
          enableReinitialize={true}
          initialValues={{
            format: '',
            maxMarkingDefinition: 'none',
          }}
          validationSchema={exportValidation(t)}
          onSubmit={this.onSubmit.bind(this)}
          onReset={this.handleClose.bind(this)}
        >
          {({ submitForm, handleReset, isSubmitting }) => (
            <Form>
              <Dialog
                open={this.state.open}
                onClose={this.handleClose.bind(this)}
                fullWidth={true}
              >
                <DialogTitle>{t('Generate an export')}</DialogTitle>
                <QueryRenderer
                  query={markingDefinitionsLinesSearchQuery}
                  variables={{ first: 200 }}
                  render={({ props }) => {
                    if (props && props.markingDefinitions) {
                      return (
                        <DialogContent>
                          <Field
                            component={SelectField}
                            name="format"
                            label={t('Export format')}
                            fullWidth={true}
                            containerstyle={{ width: '100%' }}
                          >
                            {exportScopes.map((value, i) => (
                              <MenuItem
                                key={i}
                                value={value}
                                disabled={!isExportActive(value)}
                              >
                                {value}
                              </MenuItem>
                            ))}
                          </Field>
                          <Field
                            component={SelectField}
                            name="maxMarkingDefinition"
                            label={t('Max marking definition level')}
                            fullWidth={true}
                            containerstyle={{
                              marginTop: 20,
                              width: '100%',
                            }}
                          >
                            <MenuItem value="none">{t('None')}</MenuItem>
                            {map(
                              (markingDefinition) => (
                                <MenuItem
                                  key={markingDefinition.node.id}
                                  value={markingDefinition.node.id}
                                >
                                  {markingDefinition.node.definition}
                                </MenuItem>
                              ),
                              props.markingDefinitions.edges,
                            )}
                          </Field>
                        </DialogContent>
                      );
                    }
                    return <Loader variant="inElement" />;
                  }}
                />
                <DialogActions>
                  <Button
                    onClick={handleReset}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    color="primary"
                    onClick={submitForm}
                    disabled={isSubmitting}
                    classes={{ root: classes.button }}
                  >
                    {t('Create')}
                  </Button>
                </DialogActions>
              </Dialog>
            </Form>
          )}
        </Formik>
      </div>
    );
  }
}

const StixDomainObjectsExportCreations = createFragmentContainer(
  StixDomainObjectsExportCreationComponent,
  {
    data: graphql`
      fragment StixDomainObjectsExportCreation_data on Query {
        connectorsForExport {
          id
          name
          active
          connector_scope
          updated_at
        }
      }
    `,
  },
);

StixDomainObjectsExportCreations.propTypes = {
  classes: PropTypes.object.isRequired,
  t: PropTypes.func,
  data: PropTypes.object,
  exportEntityType: PropTypes.string.isRequired,
  paginationOptions: PropTypes.object,
  context: PropTypes.string,
  onExportAsk: PropTypes.func,
};

export default compose(
  inject18n,
  withStyles(styles),
)(StixDomainObjectsExportCreations);
