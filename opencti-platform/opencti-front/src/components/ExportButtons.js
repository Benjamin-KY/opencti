import React, { Component } from 'react';
import { CSVLink } from 'react-csv';
import IconButton from '@mui/material/IconButton';
import { ImageOutlined } from '@mui/icons-material';
import { FilePdfBox, FileDelimitedOutline } from 'mdi-material-ui';
import withTheme from '@mui/styles/withTheme';
import withStyles from '@mui/styles/withStyles';
import * as R from 'ramda';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import themeLight from './ThemeLight';
import themeDark from './ThemeDark';
import { commitLocalUpdate } from '../relay/environment';
import { exportImage, exportPdf } from '../utils/Image';
import inject18n from './i18n';
import Loader from './Loader';

const styles = () => ({
  exportButtons: {
    display: 'flex',
  },
  loader: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

class ExportButtons extends Component {
  constructor(props) {
    super(props);
    this.adjust = props.adjust;
    commitLocalUpdate((store) => {
      const me = store.getRoot().getLinkedRecord('me');
      const exporting = me.getValue('exporting') || false;
      this.state = {
        anchorElImage: null,
        anchorElPdf: null,
        exporting,
      };
    });
  }

  handleOpenImage(event) {
    this.setState({ anchorElImage: event.currentTarget });
  }

  handleCloseImage() {
    this.setState({ anchorElImage: null });
  }

  exportImage(domElementId, name, theme, background) {
    this.setState({ exporting: true });
    this.handleCloseImage();
    const { theme: currentTheme, pixelRatio = 1 } = this.props;
    let timeout = 4000;
    if (theme !== currentTheme.palette.mode) {
      timeout = 6000;
      commitLocalUpdate((store) => {
        const me = store.getRoot().getLinkedRecord('me');
        me.setValue(theme, 'theme');
        me.setValue(true, 'exporting');
      });
    }
    setTimeout(() => {
      const container = document.getElementById(domElementId);
      const { offsetWidth, offsetHeight } = container;
      if (theme === currentTheme.palette.mode && this.adjust) {
        container.setAttribute('style', 'width:3840px; height:2160px');
        this.adjust(true);
      }
      setTimeout(() => {
        exportImage(
          domElementId,
          offsetWidth,
          offsetHeight,
          name,
          // eslint-disable-next-line no-nested-ternary
          background
            ? theme === 'light'
              ? themeLight().palette.background.default
              : themeDark().palette.background.default
            : null,
          pixelRatio,
          this.adjust,
        ).then(() => {
          if (theme !== currentTheme.palette.mode) {
            commitLocalUpdate((store) => {
              const me = store.getRoot().getLinkedRecord('me');
              me.setValue(false, 'exporting');
              me.setValue(currentTheme.palette.mode, 'theme');
            });
          } else {
            this.setState({ exporting: false });
          }
        });
      }, timeout / 2);
    }, timeout);
  }

  handleOpenPdf(event) {
    this.setState({ anchorElPdf: event.currentTarget });
  }

  handleClosePdf() {
    this.setState({ anchorElPdf: null });
  }

  exportPdf(domElementId, name, theme, background) {
    this.setState({ exporting: true });
    this.handleClosePdf();
    const { theme: currentTheme, pixelRatio = 1 } = this.props;
    let timeout = 4000;
    if (theme !== currentTheme.palette.mode) {
      timeout = 6000;
      commitLocalUpdate((store) => {
        const me = store.getRoot().getLinkedRecord('me');
        me.setValue(true, 'exporting');
        me.setValue(theme, 'theme');
      });
    }
    setTimeout(() => {
      exportPdf(
        domElementId,
        name,
        // eslint-disable-next-line no-nested-ternary
        background
          ? theme === 'light'
            ? themeLight().palette.background.default
            : themeDark().palette.background.default
          : null,
        pixelRatio,
        this.adjust,
      ).then(() => {
        if (theme !== currentTheme.palette.mode) {
          commitLocalUpdate((store) => {
            const me = store.getRoot().getLinkedRecord('me');
            me.setValue(false, 'exporting');
            me.setValue(currentTheme.palette.mode, 'theme');
          });
        } else {
          this.setState({ exporting: false });
        }
      });
    }, timeout);
  }

  render() {
    const { anchorElImage, anchorElPdf, exporting } = this.state;
    const { classes, t, domElementId, name, csvData } = this.props;
    return (
      <div className={classes.exportButtons}>
        <Tooltip title={t('Export to image')}>
          <IconButton
            onClick={this.handleOpenImage.bind(this)}
            aria-haspopup="true"
            color="primary"
            size="large"
          >
            <ImageOutlined />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorElImage}
          open={Boolean(anchorElImage)}
          onClose={this.handleCloseImage.bind(this)}
          style={{ marginTop: 50 }}
        >
          <MenuItem
            onClick={this.exportImage.bind(
              this,
              domElementId,
              name,
              'dark',
              true,
            )}
          >
            {t('Dark (with background)')}
          </MenuItem>
          <MenuItem
            onClick={this.exportImage.bind(
              this,
              domElementId,
              name,
              'dark',
              false,
            )}
          >
            {t('Dark (without background)')}
          </MenuItem>
          <MenuItem
            onClick={this.exportImage.bind(
              this,
              domElementId,
              name,
              'light',
              true,
            )}
          >
            {t('Light (with background)')}
          </MenuItem>
          <MenuItem
            onClick={this.exportImage.bind(
              this,
              domElementId,
              name,
              'light',
              false,
            )}
          >
            {t('Light (without background)')}
          </MenuItem>
        </Menu>
        <Tooltip title={t('Export to PDF')}>
          <IconButton
            onClick={this.handleOpenPdf.bind(this)}
            aria-haspopup="true"
            color="primary"
            size="large"
          >
            <FilePdfBox />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorElPdf}
          open={Boolean(anchorElPdf)}
          onClose={this.handleClosePdf.bind(this)}
          style={{ marginTop: 50 }}
        >
          <MenuItem
            onClick={this.exportPdf.bind(
              this,
              domElementId,
              name,
              'dark',
              true,
            )}
          >
            {t('Dark')}
          </MenuItem>
          <MenuItem
            onClick={this.exportPdf.bind(
              this,
              domElementId,
              name,
              'light',
              true,
            )}
          >
            {t('Light')}
          </MenuItem>
        </Menu>
        {csvData && (
          <Tooltip title={t('Export to CSV')}>
            <CSVLink data={csvData}>
              <IconButton aria-haspopup="true" color="primary" size="large">
                <FileDelimitedOutline />
              </IconButton>
            </CSVLink>
          </Tooltip>
        )}
        <Dialog
          open={exporting}
          keepMounted={true}
          fullScreen={true}
          classes={{ paper: classes.loader }}
        >
          <Loader />
        </Dialog>
      </div>
    );
  }
}

export default R.compose(
  inject18n,
  withTheme,
  withStyles(styles),
)(ExportButtons);
