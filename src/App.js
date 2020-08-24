import React, { Component, Fragment } from 'react';
import axios from 'axios';

const axiosGithubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`,
  }
});

const TITLE = 'React GraphQL Github Client';
const GET_ORGANIZATION = `
 {
  organization(login: "the-road-to-learn-react") {
    name
    url
  }
 }
`;

const  GET_REPOSITORY_OF_ORGANIZATION = `
  {
    organization(login: "the-road-to-learn-react") {
      name
      url
      repository(name: "the-road-to-learn-react") {
        name
        url
      }
    }
  }
`;

const GET_ISSUES_OF_REPOSITORY = `
  query (
    $organization: String!, 
    $repository: String!,
    $cursor: String)  {
      organization(login: $organization) {
        name
        url
        repository(name: $repository) {
          name
          url
          issues(first: 5, after: $cursor, states: [OPEN]) {
            edges {
              node {
                id
                title
                url
                reactions(last: 3) {
                  edges {
                    node {
                      id
                      content
                    }
                  }
                }
              }
            }
            totalCount
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    }
`;

const getIssuesOfRepositoryQuery = (organization, repository) => `
{
  organization(login: "${organization}") {
    name
    url
    repository(name: "${repository}") {
      name
      url
      issues(last: 5) {
        edges {
          node {
            id
            title
            url
          }
        }
      }
    }
  }
}
`;

const getIssuesOfRepository = (path, cursor) => {
  const [organization, repository] = path.split('/');

  return axiosGithubGraphQL.post('', {
    query: GET_ISSUES_OF_REPOSITORY,
    variables: { organization, repository, cursor }
  })
};

const resolveIssuesQuery = (queryResult, cursor) => state => {
 const { data, errors } = queryResult.data;

 if (!cursor) {
   return {
    organization: data.organization,
    errors
   }
 }

 const { edges: oldIssues } = state.organization.repository.issues;
 const { edges: newIssues } = data.organization.repository.issues;
 const updatedIssues = [...oldIssues, ...newIssues];

 return {
   organization: {
     ...data.organization,
     repository: {
       ...data.organization.repository,
       issues: {
         ...data.organization.repository.issues,
         edges: updatedIssues,
       }
     }
   },
   errors,
 }
};

class App extends Component {
  state = {
    path: 'the-road-to-learn-react/the-road-to-learn-react',
    organization: null,
    errors: null
  };

  componentDidMount() {
    this.onFetchFromGithub(this.state.path);
  }

  onChange = event => {
    this.setState({
      path: event.target.value
    });
  };

  onSubmit = event => {
    this.onFetchFromGitHub(this.state.path);
    event.preventDefault();
  }

  onFetchFromGithub= (path, cursor) => { 
    getIssuesOfRepository(path, cursor)
      .then(queryResult => {
        console.log(queryResult);
        this.setState(resolveIssuesQuery(queryResult, cursor));
      });
  }

  onFetchMoreIssues = () => {
    const {
      endCursor,
    } = this.state.organization.repository.issues.pageInfo;

    this.onFetchFromGithub(this.state.path, endCursor);
  };

  render() {
    const { path, organization, errors } = this.state;

    return (
      <div>
        <h1>{TITLE}</h1>
        <form onSubmit={this.onSubmit}>
          <label htmlFor="url">
            Show open issues for https://github.com/
          </label>
          <input 
            id="url"
            type="text"
            value={path}
            onChange={this.onChange}
            style={{ width: '300px' }}/>
          <button type="submit">Search</button>
        </form>
        <hr />
        {organization ? (
          <Organization 
            organization={organization} 
            errors={errors}
            onFetchMoreIssues={this.onFetchMoreIssues}/>
        ) : (
          <p>No information yet ...</p>
        )}
      </div>
    );
  } 
}

const Organization = ({ organization, errors, onFetchMoreIssues }) => {
  if (errors) {
    return (
      <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    );
  }

  return (
        <div>
          <p>
            <strong>Issues from Organization:</strong>
            <a href={organization.url}>{organization.name}</a>
          </p>  
          <Repository 
            repository={organization.repository}
            onFetchMoreIssues={onFetchMoreIssues}
          />
        </div>
      )};

const Repository = ({ repository, onFetchMoreIssues }) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <ul>
      {
        repository.issues.edges.map(issue => (
          <li key={issue.node.id}>
            <a href={issue.node.url}>{issue.node.title}</a><br />
            <ReactionsList node={issue.node}/>
          </li>
        ))
      }
    </ul>
    <hr />
    {repository.issues.pageInfo.hasNextPage && <button onClick={onFetchMoreIssues}>More</button>}
  </div>  
);

const ReactionsList = (props) => {
  const { node: { reactions: { edges } } } = props;

  if (edges.length === 0) return null;

  return (
        <Fragment>
          <strong>Reactions:</strong><br />
          <ul>
            {
              edges.map(reaction => (
                <ReactionItem key={reaction.node.id} reaction={reaction.node}/>
              ))
            }
          </ul>
        </Fragment>
    );
}

const ReactionItem = ({ reaction }) => (
  <li>{reaction.content}</li>
);

export default App;
