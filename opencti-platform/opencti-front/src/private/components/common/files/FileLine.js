import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { compose, filter, isEmpty, propOr } from 'ramda';
import moment from 'moment';
import { createFragmentContainer } from 'react-relay';
import graphql from 'babel-plugin-relay/macro';
import withStyles from '@mui/styles/withStyles';
import IconButton from '@mui/material/IconButton';
import { FileOutline, ProgressUpload } from 'mdi-material-ui';
import {
  DeleteOutlined,
  GetAppOutlined,
  WarningOutlined,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItem from '@mui/material/ListItem';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import CircularProgress from '@mui/material/CircularProgress';
import { Link } from 'react-router-dom';
import {
  APP_BASE_PATH,
  commitMutation,
  MESSAGING$,
} from '../../../../relay/environment';
import inject18n from '../../../../components/i18n';
import FileWork from './FileWork';

const styles = (theme) => ({
  item: {
    paddingLeft: 10,
    height: 50,
  },
  itemNested: {
    paddingLeft: theme.spacing(4),
    height: 50,
  },
  itemText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 10,
  },
});

const FileLineDeleteMutation = graphql`
  mutation FileLineDeleteMutation($fileName: String) {
    deleteImport(fileName: $fileName)
  }
`;

const FileLineAskDeleteMutation = graphql`
  mutation FileLineAskDeleteMutation($workId: ID!) {
    workEdit(id: $workId) {
      delete
    }
  }
`;

class FileLineComponent extends Component {
  executeRemove(mutation, variables) {
    const { t } = this.props;
    commitMutation({
      mutation,
      variables,
      optimisticUpdater: (store) => {
        const fileStore = store.get(this.props.file.id);
        fileStore.setValue(0, 'lastModifiedSinceMin');
        fileStore.setValue('progress', 'uploadStatus');
      },
      updater: (store) => {
        const fileStore = store.get(this.props.file.id);
        fileStore.setValue(0, 'lastModifiedSinceMin');
        fileStore.setValue('progress', 'uploadStatus');
      },
      onCompleted: () => {
        MESSAGING$.notifySuccess(t('File successfully removed'));
      },
    });
  }

  handleRemoveFile(name) {
    this.executeRemove(FileLineDeleteMutation, { fileName: name });
  }

  handleRemoveJob(id) {
    this.executeRemove(FileLineAskDeleteMutation, { workId: id });
  }

  render() {
    const {
      classes,
      t,
      fld,
      file,
      connectors,
      dense,
      disableImport,
      directDownload,
      handleOpenImport,
      nested,
    } = this.props;
    const { lastModifiedSinceMin, uploadStatus, metaData } = file;
    const { messages, errors } = metaData;
    const isFail = errors.length > 0;
    const isProgress = uploadStatus === 'progress' || uploadStatus === 'wait';
    const isOutdated = uploadStatus === 'timeout';
    const isImportActive = () => connectors && filter((x) => x.data.active, connectors).length > 0;
    const history = [];
    if (isOutdated) {
      const time = moment.duration(lastModifiedSinceMin, 'minutes').humanize();
      history.push({
        message: `Connector execution timeout, no activity for ${time}`,
      });
    } else {
      history.push(...[...messages, ...errors]);
    }
    const toolTip = history
      .map((s) => s.message)
      .filter((s) => !isEmpty(s))
      .join(', ');
    return (
      <div>
        <ListItem
          divider={true}
          dense={dense === true}
          classes={{ root: nested ? classes.itemNested : classes.item }}
          button={true}
          component={isOutdated ? null : Link}
          disabled={isProgress}
          to={
            directDownload
              ? `/storage/get/${file.id}`
              : `/storage/view/${file.id}`
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          <ListItemIcon>
            {isProgress && (
              <CircularProgress
                size={20}
                color={nested ? 'primary' : 'inherit'}
              />
            )}
            {!isProgress && (isFail || isOutdated) && (
              <Tooltip title={toolTip !== 'null' ? toolTip : ''}>
                <WarningOutlined
                  color={nested ? 'primary' : 'inherit'}
                  style={{ fontSize: 15, color: '#f44336' }}
                />
              </Tooltip>
            )}
            {!isProgress && !isFail && !isOutdated && (
              <FileOutline color={nested ? 'primary' : 'inherit'} />
            )}
          </ListItemIcon>
          <Tooltip title={!isFail && !isOutdated ? file.name : ''}>
            <ListItemText
              classes={{ root: classes.itemText }}
              primary={file.name}
              secondary={fld(propOr(moment(), 'lastModified', file))}
            />
          </Tooltip>
          <ListItemSecondaryAction>
            {!disableImport && (
              <Tooltip title={t('Launch an import of this file')}>
                <span>
                  <IconButton
                    disabled={isProgress || !isImportActive()}
                    onClick={handleOpenImport.bind(this, file)}
                    aria-haspopup="true"
                    color={nested ? 'inherit' : 'primary'}
                    size="large"
                  >
                    <ProgressUpload />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {!directDownload && !isFail && (
              <Tooltip title={t('Download this file')}>
                <span>
                  <IconButton
                    disabled={isProgress}
                    href={`${APP_BASE_PATH}/storage/get/${file.id}`}
                    aria-haspopup="true"
                    color={nested ? 'inherit' : 'primary'}
                    size="large"
                  >
                    <GetAppOutlined />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip title={t('Delete this file')}>
              <span>
                <IconButton
                  disabled={isProgress}
                  color={nested ? 'inherit' : 'primary'}
                  onClick={this.handleRemoveFile.bind(this, file.id)}
                  size="large"
                >
                  <DeleteOutlined />
                </IconButton>
              </span>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
        <FileWork file={file} />
      </div>
    );
  }
}

FileLineComponent.propTypes = {
  t: PropTypes.func,
  fld: PropTypes.func,
  classes: PropTypes.object,
  file: PropTypes.object.isRequired,
  connectors: PropTypes.array,
  dense: PropTypes.bool,
  disableImport: PropTypes.bool,
  directDownload: PropTypes.bool,
  handleOpenImport: PropTypes.func,
  nested: PropTypes.bool,
};

const FileLine = createFragmentContainer(FileLineComponent, {
  file: graphql`
    fragment FileLine_file on File {
      id
      name
      uploadStatus
      lastModified
      lastModifiedSinceMin
      metaData {
        mimetype
        list_filters
        messages {
          timestamp
          message
        }
        errors {
          timestamp
          message
        }
      }
      ...FileWork_file
    }
  `,
});

export default compose(inject18n, withStyles(styles))(FileLine);
