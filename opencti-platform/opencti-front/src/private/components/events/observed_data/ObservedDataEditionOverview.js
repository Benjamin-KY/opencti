import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import { Formik, Field, Form } from 'formik';
import withStyles from '@mui/styles/withStyles';
import * as Yup from 'yup';
import * as R from 'ramda';
import { commitMutation } from '../../../../relay/environment';
import inject18n from '../../../../components/i18n';
import TextField from '../../../../components/TextField';
import { SubscriptionFocus } from '../../../../components/Subscription';
import CreatedByField from '../../common/form/CreatedByField';
import ObjectMarkingField from '../../common/form/ObjectMarkingField';
import ConfidenceField from '../../common/form/ConfidenceField';
import DatePickerField from '../../../../components/DatePickerField';
import { adaptFieldValue } from '../../../../utils/String';
import CommitMessage from '../../common/form/CommitMessage';
import StatusField from '../../common/form/StatusField';
import { parse } from '../../../../utils/Time';

const styles = (theme) => ({
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    overflow: 'hidden',
    backgroundColor: theme.palette.navAlt.background,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: '30px 30px 30px 30px',
  },
  createButton: {
    position: 'fixed',
    bottom: 30,
    right: 30,
  },
  importButton: {
    position: 'absolute',
    top: 30,
    right: 30,
  },
});

export const observedDataMutationFieldPatch = graphql`
  mutation ObservedDataEditionOverviewFieldPatchMutation(
    $id: ID!
    $input: [EditInput]!
    $commitMessage: String
    $references: [String]
  ) {
    observedDataEdit(id: $id) {
      fieldPatch(
        input: $input
        commitMessage: $commitMessage
        references: $references
      ) {
        ...ObservedDataEditionOverview_observedData
      }
    }
  }
`;

export const observedDataEditionOverviewFocus = graphql`
  mutation ObservedDataEditionOverviewFocusMutation(
    $id: ID!
    $input: EditContext!
  ) {
    observedDataEdit(id: $id) {
      contextPatch(input: $input) {
        id
      }
    }
  }
`;

const observedDataMutationRelationAdd = graphql`
  mutation ObservedDataEditionOverviewRelationAddMutation(
    $id: ID!
    $input: StixMetaRelationshipAddInput
  ) {
    observedDataEdit(id: $id) {
      relationAdd(input: $input) {
        from {
          ...ObservedDataEditionOverview_observedData
        }
      }
    }
  }
`;

const observedDataMutationRelationDelete = graphql`
  mutation ObservedDataEditionOverviewRelationDeleteMutation(
    $id: ID!
    $toId: String!
    $relationship_type: String!
  ) {
    observedDataEdit(id: $id) {
      relationDelete(toId: $toId, relationship_type: $relationship_type) {
        ...ObservedDataEditionOverview_observedData
      }
    }
  }
`;

const observedDataValidation = (t) => Yup.object().shape({
  first_observed: Yup.date().required(t('This field is required')),
  last_observed: Yup.date().required(t('This field is required')),
  number_observed: Yup.number().required(t('This field is required')),
  confidence: Yup.number(),
  references: Yup.array().required(t('This field is required')),
});

class ObservedDataEditionOverviewComponent extends Component {
  handleChangeFocus(name) {
    commitMutation({
      mutation: observedDataEditionOverviewFocus,
      variables: {
        id: this.props.observedData.id,
        input: {
          focusOn: name,
        },
      },
    });
  }

  onSubmit(values, { setSubmitting }) {
    const commitMessage = values.message;
    const references = R.pluck('value', values.references || []);
    const inputValues = R.pipe(
      R.dissoc('message'),
      R.dissoc('references'),
      R.assoc('first_observed', parse(values.first_observed).format()),
      R.assoc('last_observed', parse(values.last_observed).format()),
      R.assoc('status_id', values.status_id?.value),
      R.assoc('createdBy', values.createdBy?.value),
      R.assoc('objectMarking', R.pluck('value', values.objectMarking)),
      R.toPairs,
      R.map((n) => ({
        key: n[0],
        value: adaptFieldValue(n[1]),
      })),
    )(values);
    commitMutation({
      mutation: observedDataMutationFieldPatch,
      variables: {
        id: this.props.observedData.id,
        input: inputValues,
        commitMessage:
          commitMessage && commitMessage.length > 0 ? commitMessage : null,
        references,
      },
      setSubmitting,
      onCompleted: () => {
        setSubmitting(false);
        this.props.handleClose();
      },
    });
  }

  handleSubmitField(name, value) {
    if (!this.props.enableReferences) {
      observedDataValidation(this.props.t)
        .validateAt(name, { [name]: value })
        .then(() => {
          commitMutation({
            mutation: observedDataMutationFieldPatch,
            variables: {
              id: this.props.observedData.id,
              input: {
                key: name,
                value: value || '',
              },
            },
          });
        })
        .catch(() => false);
    }
  }

  handleChangeCreatedBy(name, value) {
    if (!this.props.enableReferences) {
      commitMutation({
        mutation: observedDataMutationFieldPatch,
        variables: {
          id: this.props.observedData.id,
          input: { key: 'createdBy', value: value.value || '' },
        },
      });
    }
  }

  handleChangeObjectMarking(name, values) {
    if (!this.props.enableReferences) {
      const { observedData } = this.props;
      const currentMarkingDefinitions = R.pipe(
        R.pathOr([], ['objectMarking', 'edges']),
        R.map((n) => ({
          label: n.node.definition,
          value: n.node.id,
        })),
      )(observedData);
      const added = R.difference(values, currentMarkingDefinitions);
      const removed = R.difference(currentMarkingDefinitions, values);
      if (added.length > 0) {
        commitMutation({
          mutation: observedDataMutationRelationAdd,
          variables: {
            id: this.props.observedData.id,
            input: {
              toId: R.head(added).value,
              relationship_type: 'object-marking',
            },
          },
        });
      }
      if (removed.length > 0) {
        commitMutation({
          mutation: observedDataMutationRelationDelete,
          variables: {
            id: this.props.observedData.id,
            toId: R.head(removed).value,
            relationship_type: 'object-marking',
          },
        });
      }
    }
  }

  render() {
    const { t, observedData, context, enableReferences } = this.props;
    const createdBy = R.pathOr(null, ['createdBy', 'name'], observedData) === null
      ? ''
      : {
        label: R.pathOr(null, ['createdBy', 'name'], observedData),
        value: R.pathOr(null, ['createdBy', 'id'], observedData),
      };
    const objectMarking = R.pipe(
      R.pathOr([], ['objectMarking', 'edges']),
      R.map((n) => ({
        label: n.node.definition,
        value: n.node.id,
      })),
    )(observedData);
    const initialValues = R.pipe(
      R.assoc('createdBy', createdBy),
      R.assoc('objectMarking', objectMarking),
      R.pick([
        'first_observed',
        'last_observed',
        'number_observed',
        'confidence',
        'createdBy',
        'objectMarking',
      ]),
    )(observedData);
    return (
      <Formik
        enableReinitialize={true}
        initialValues={initialValues}
        validationSchema={observedDataValidation(t)}
        onSubmit={this.onSubmit.bind(this)}
      >
        {({
          submitForm,
          isSubmitting,
          validateForm,
          setFieldValue,
          values,
        }) => (
          <div>
            <Form style={{ margin: '20px 0 20px 0' }}>
              <Field
                component={DatePickerField}
                name="first_observed"
                label={t('First observed')}
                invalidDateMessage={t('The value must be a date (YYYY-MM-DD)')}
                fullWidth={true}
                onFocus={this.handleChangeFocus.bind(this)}
                onSubmit={this.handleSubmitField.bind(this)}
                helperText={
                  <SubscriptionFocus
                    context={context}
                    fieldName="first_observed"
                  />
                }
              />
              <Field
                component={DatePickerField}
                name="last_observed"
                label={t('Last observed')}
                invalidDateMessage={t('The value must be a date (YYYY-MM-DD)')}
                fullWidth={true}
                style={{ marginTop: 20 }}
                onFocus={this.handleChangeFocus.bind(this)}
                onSubmit={this.handleSubmitField.bind(this)}
                helperText={
                  <SubscriptionFocus
                    context={context}
                    fieldName="last_observed"
                  />
                }
              />
              <Field
                component={TextField}
                name="number_observed"
                label={t('Number observed')}
                fullWidth={true}
                style={{ marginTop: 20 }}
                onFocus={this.handleChangeFocus.bind(this)}
                onSubmit={this.handleSubmitField.bind(this)}
                helperText={
                  <SubscriptionFocus
                    context={context}
                    fieldName="number_observed"
                  />
                }
              />
              <ConfidenceField
                name="confidence"
                onFocus={this.handleChangeFocus.bind(this)}
                onChange={this.handleSubmitField.bind(this)}
                label={t('Confidence')}
                fullWidth={true}
                containerstyle={{ width: '100%', marginTop: 20 }}
                editContext={context}
                variant="edit"
              />
              {observedData.workflowEnabled && (
                <StatusField
                  name="status_id"
                  type="Observed-Data"
                  onFocus={this.handleChangeFocus.bind(this)}
                  onChange={this.handleSubmitField.bind(this)}
                  setFieldValue={setFieldValue}
                  style={{ marginTop: 20 }}
                  helpertext={
                    <SubscriptionFocus
                      context={context}
                      fieldName="status_id"
                    />
                  }
                />
              )}
              <CreatedByField
                name="createdBy"
                style={{ marginTop: 20, width: '100%' }}
                setFieldValue={setFieldValue}
                helpertext={
                  <SubscriptionFocus context={context} fieldName="createdBy" />
                }
                onChange={this.handleChangeCreatedBy.bind(this)}
              />
              <ObjectMarkingField
                name="objectMarking"
                style={{ marginTop: 20, width: '100%' }}
                helpertext={
                  <SubscriptionFocus
                    context={context}
                    fieldname="objectMarking"
                  />
                }
                onChange={this.handleChangeObjectMarking.bind(this)}
              />
              {enableReferences && (
                <CommitMessage
                  submitForm={submitForm}
                  disabled={isSubmitting}
                  validateForm={validateForm}
                  setFieldValue={setFieldValue}
                  values={values}
                />
              )}
            </Form>
          </div>
        )}
      </Formik>
    );
  }
}

ObservedDataEditionOverviewComponent.propTypes = {
  classes: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
  observedData: PropTypes.object,
  enableReferences: PropTypes.bool,
  context: PropTypes.array,
};

const ObservedDataEditionOverview = createFragmentContainer(
  ObservedDataEditionOverviewComponent,
  {
    observedData: graphql`
      fragment ObservedDataEditionOverview_observedData on ObservedData {
        id
        confidence
        first_observed
        last_observed
        number_observed
        createdBy {
          ... on Identity {
            id
            name
            entity_type
          }
        }
        objectMarking {
          edges {
            node {
              id
              definition
              definition_type
            }
          }
        }
        workflowEnabled
        is_inferred
      }
    `,
  },
);

export default R.compose(
  inject18n,
  withStyles(styles, { withTheme: true }),
)(ObservedDataEditionOverview);
