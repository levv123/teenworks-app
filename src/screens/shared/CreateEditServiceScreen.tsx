/**
 * Post a Service.
 *
 * The long single-page form that used to live here has been replaced by a
 * three-step flow (choose category → service details → preview & post) in
 * ./post-service/. This module stays as the screen entry point so both
 * navigator registrations in AppNavigator keep working unchanged.
 */
export { PostServiceFlow as CreateEditServiceScreen } from './post-service/PostServiceFlow';
