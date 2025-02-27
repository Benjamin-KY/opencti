import graphql from 'babel-plugin-relay/macro';

// eslint-disable-next-line import/prefer-default-export
export const attributesSearchQuery = graphql`
  query AttributesQuerySearchQuery(
    $first: Int
    $search: String
    $attributeName: String!
  ) {
    runtimeAttributes(
      first: $first
      search: $search
      attributeName: $attributeName
    ) {
      edges {
        node {
          id
          value
        }
      }
    }
  }
`;
