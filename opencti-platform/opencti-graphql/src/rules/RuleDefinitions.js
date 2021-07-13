import AttributedToAttributedDefinition from './attributed-to-attributed/AttributedToAttributedDefinition';
import ObservableRelatedDefinition from './observable-related/ObservableRelatedDefinition';
import AttributionUseDefinition from './attribution-use/AttributionUseDefinition';
import AttributionTargetsD from './attribution-targets/AttributionTargetsDefinition';
import LocationTargetsDefinition from './location-targets/LocationTargetsDefinition';
import PartOfTargetsDefinition from './part-of-targets/PartOfTargetsDefinition';
import LocatedAtLocatedDefinition from './located-at-located/LocatedAtLocatedDefinition';
import LocalizationOfTargetsDefinition from './localization-of-targets/LocalizationOfTargetsDefinition';
import RelatedToRelatedDefinition from './testing/related-to-related/RelatedToRelatedDefinition';
import { DEV_MODE } from '../config/conf';

const declaredDef = [
  AttributedToAttributedDefinition,
  ObservableRelatedDefinition,
  AttributionUseDefinition,
  AttributionTargetsD,
  LocationTargetsDefinition,
  PartOfTargetsDefinition,
  LocatedAtLocatedDefinition,
  LocalizationOfTargetsDefinition,
];
if (DEV_MODE) {
  declaredDef.push(...[RelatedToRelatedDefinition]);
}
export default declaredDef;