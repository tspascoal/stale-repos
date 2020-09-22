/* istanbul ignore file */
import nock from 'nock'
import clone from 'clone'
import { RepoActivity } from '../src/RepoActivity' // eslint-disable-line no-unused-vars

export function addArchiveRepoMockExpect () {
  nock('https://api.github.com')
    .patch('/repos/dummy/dummy', (body: any) => {
      expect(body.archived).toBe(true)

      return true
    })
    .reply(200)
}

export function addArchiveMockFailIfCalledExpect () {
  nock('https://api.github.com')
    .patch('/repos/dummy/dummy', () => {
      expect(false).toBeTruthy()
      return false
    })
    .reply(200)
}

export function addUpdateTopicMockAndExpect (expectTopics: string[]) {
  nock('https://api.github.com')
    .put('/repos/dummy/dummy/topics', (body: any) => {
      expect(body.names).toMatchObject(expectTopics)

      return true
    })
    .reply(200)
}

export function addUpdateTopicMockFailIfCalledExpect () {
  nock('https://api.github.com')
    .put('/repos/dummy/dummy/topics', () => {
      expect(false).toBeTruthy()
      return false
    })
    .reply(200)
}

export function addGetTopicsMock (topics: string[]) {
  nock('https://api.github.com')
    .get('/repos/dummy/dummy/topics')
    .reply(200, { names: topics })
}

export function addGraphQLQueryMock (queryResult: RepoActivity) {
  nock('https://api.github.com')
    .post('/graphql')
    .reply(200, queryResult)
}

// HACK: pass mock date into the payload
// Using a global mock interferes with probot itself
function setMockDateOnPayload (payload: any, date?: Date) {
  payload.__mockNow = date
}
export function getPayloadWithMockDate (payload: any, date: Date): any {
  const patchedSchedulePayload = clone(payload)

  setMockDateOnPayload(patchedSchedulePayload, date)

  return patchedSchedulePayload
}
