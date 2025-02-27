import React, { useContext } from 'react';
import * as PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import enLocale from 'date-fns/locale/en-US';
import cnLocale from 'date-fns/locale/zh-CN';
import moment from 'moment';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import { pathOr } from 'ramda';
import locale, { DEFAULT_LANG } from '../utils/BrowserLanguage';
import i18n from '../utils/Localization';
import { UserContext } from '../utils/Security';

const localeMap = {
  'en-us': enLocale,
  'fr-fr': frLocale,
  'zg-cn': cnLocale,
};

const AppIntlProvider = (props) => {
  const { children } = props;
  const { me } = useContext(UserContext);
  const platformLanguage = pathOr(
    null,
    ['settings', 'platform_language'],
    props,
  );
  const platformLang = platformLanguage !== null && platformLanguage !== 'auto'
    ? props.settings.platform_language
    : locale;
  const lang = me
    && me.language !== null
    && me.language !== undefined
    && me.language !== 'auto'
    ? me.language
    : platformLang;
  const baseMessages = i18n.messages[lang] || i18n.messages[DEFAULT_LANG];
  if (lang === 'fr-fr') {
    moment.locale('fr-fr');
  } else if (lang === 'zh-cn') {
    moment.locale('zh-cn');
  } else {
    moment.locale('en-us');
  }
  return (
    <IntlProvider
      locale={lang}
      key={lang}
      messages={baseMessages}
      onError={(err) => {
        if (err.code === 'MISSING_TRANSLATION') {
          return;
        }
        throw err;
      }}
    >
      <LocalizationProvider
        dateAdapter={AdapterDateFns}
        locale={localeMap[locale]}
      >
        {children}
      </LocalizationProvider>
    </IntlProvider>
  );
};

AppIntlProvider.propTypes = {
  children: PropTypes.node,
  settings: PropTypes.object,
};

export const ConnectedIntlProvider = createFragmentContainer(AppIntlProvider, {
  settings: graphql`
    fragment AppIntlProvider_settings on Settings {
      platform_language
    }
  `,
});

export default AppIntlProvider;
