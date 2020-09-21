import { GitHubAPI, Logger } from 'probot' // eslint-disable-line no-unused-vars

export class Stale {
  private github: GitHubAPI;
  private owner: string;
  private repo: string;
  private logger: Logger;
  private staleTopic: string;

  /** @constructor
   * @param  {GitHubAPI} github
   * @param  {string} staleTopic - The name of topic used to mark a stale repo
   * @param  {string} owner - Repo owner
   * @param  {string} repo - Repo name
   * @param  {Logger} logger
   */
  constructor (github: GitHubAPI, staleTopic: string, owner: string, repo: string, logger: Logger) {
    this.github = github
    this.owner = owner
    this.repo = repo
    this.staleTopic = staleTopic
    this.logger = logger
  }

  private getLoggingContext (): string {
    return `${this.owner}/${this.repo}`
  }

  /**
   * Gets the repo activity to determine if it is stale or not.
   * Returns last update of an issue, pull request and last push.
   * Also returns if the repos is archived, disable or locked.
   * @todo the output should be tipified
   * @returns Promise
   */
  public async getRepoActivity (): Promise<any> {
    const query = `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              id
              isFork
              updatedAt
              pushedAt
              isArchived
              isDisabled
              isLocked
              issues(first: 1, orderBy: { field: UPDATED_AT , direction: DESC} ) {
                nodes {
                  updatedAt
                }
              }
              pullRequests(first: 1, orderBy: {field: UPDATED_AT, direction: DESC}) {
                nodes {
                  updatedAt
                }
              }      
            }  
          }`

    return await this.github.graphql(query, {
      owner: this.owner,
      repo: this.repo
    })
  }

  /**
   * Indicates if a repo is active (not archichec, disabled or locked)
   * @param  {any} queryResult
   */
  public isRepoActive (queryResult: any) {
    return !(queryResult.repository.isArchived || queryResult.repository.isDisabled || queryResult.repository.isLocked)
  }

  /**
   * Return how many seconds ago the repository had an update
   * @param  {any} queryResult
   * @returns number
   */
  public getElapsedTimeSinceLastUpdate (queryResult: any, currentTime: Date = new Date()): number {
    const updates = [
      // Don't use updated at, because adding/removing topics changes it. But this make us blind to other changes on the repo metatada
      // queryResult.repository.updatedAt,
      queryResult.repository.pushedAt
    ]

    if (queryResult.repository.issues.nodes.length > 0) {
      updates.push(queryResult.repository.issues.nodes[0].updatedAt)
    }
    if (queryResult.repository.pullRequests.nodes.length > 0) {
      updates.push(queryResult.repository.pullRequests.nodes[0].updatedAt)
    }

    this.logger.debug(`${this.getLoggingContext()} ${updates.toString()}`)

    const lastUpdate: Date = new Date(updates.reduce((a, b) => (Date.parse(a) > Date.parse(b) ? a : b)))

    this.logger.info(`${this.getLoggingContext()} lastUpdate ${lastUpdate}`)

    const lastUpdateAgo = (currentTime.valueOf() - lastUpdate.valueOf()) / 1000

    this.logger.info(`${this.getLoggingContext()} ago ${lastUpdateAgo} seconds`)

    return lastUpdateAgo
  }

  /**
   * Checks if the repo is stale given maxInactivityHours parameter
   * @param  {number} lastUpdateSeconds - How many seconds ago the repo had the last update
   * @param  {number} maxInactivityHours - Threshold upon which the repo will be considered stale
   * @returns boolean
   */
  public isRepoStale (lastUpdateSeconds: number, maxInactivityHours: number): boolean {
    return lastUpdateSeconds > maxInactivityHours * 60 * 60
  }

  /**
   * Fetches the repo topics list
   * @returns Array of topics
   */
  public async getRepoTopics (): Promise<string[]> {
    const topics = await this.github.repos.listTopics({
      repo: this.repo,
      owner: this.owner
    })

    this.logger.debug(`${this.getLoggingContext()} topics ${topics.data.names.toString()}`)

    return topics.data.names
  }

  /**
  * Check if the topics list contains the stale topic
  * @param  {string[]} topics
   * @returns boolean
   */
  public hasStaleTopic (topics: string[]): boolean {
    return topics.indexOf(this.staleTopic) !== -1
  }

  /**
   * Update repo topics to mark it or unmark it as stale based on isStale parameter as well as the
   * repo topics
   * @param  {boolean} isStale Is the repo stale?
   * @param  {string[]} repoTopics The current topics for the repo
   * @returns Promise
   */
  public async updateRepoTopics (isStale: boolean, repoTopics: string[]): Promise<boolean> {
    const hasStaleTopic = this.hasStaleTopic(repoTopics)

    this.logger.info(`${this.getLoggingContext()} isStale ${isStale} hasStaleTopic ${hasStaleTopic}`)

    let hasChanges = false
    if (isStale) {
      if (hasStaleTopic === false) {
        hasChanges = true
        repoTopics.push(this.staleTopic)
      }
    } else { // not stale
      if (hasStaleTopic) { // Remove stale topic
        repoTopics = repoTopics.filter(e => e !== this.staleTopic)
        hasChanges = true
      }
    }

    if (hasChanges) {
      this.logger.info(`${this.getLoggingContext()} updating topics ${repoTopics.toString()}`)

      await this.github.repos.replaceTopics(
        {
          repo: this.repo,
          owner: this.owner,
          names: repoTopics,
          mediaType: {
            previews: [
              'mercy'
            ]
          }
        }
      )
    }

    return hasChanges
  }
}
