import nock from 'nock'
import staleRepoApp from '../src'

import { Probot } from 'probot'

import clone from 'clone'

// Requiring our fixtures
import schedulePayload from './fixtures/schedule.repository.json'
import activeQueryResult from './fixtures/query-active.json'
import { RepoActivity } from '../src/RepoActivity' // eslint-disable-line no-unused-vars
const fs = require('fs')
const path = require('path')

describe('stale repo bot', () => {
  let probot: any
  let mockCert: string

  beforeAll((done: Function) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err: Error, cert: string) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert })
    probot.load(staleRepoApp)
  })

  test('repo not stale remove stale topic', async (done) => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is not stale
    queryResult.data.repository.pushedAt = new Date()

    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, queryResult)

    // simulate get topics
    nock('https://api.github.com')
      .get('/repos/dummy/dummy/topics')
      .reply(200, { names: ['dummyTopic', 'stale'] })

    // topics updated and stale was removed
    nock('https://api.github.com')
      .put('/repos/dummy/dummy/topics', (body: any) => {
        done(expect(body.names).toMatchObject(['dummyTopic']))

        return true
      })
      .reply(200)

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })
    await done()
  })

  test('repo not stale nothing to remove', async (done) => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is not stale
    queryResult.data.repository.pushedAt = new Date()

    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, queryResult)

    // simulate get topics
    nock('https://api.github.com')
      .get('/repos/dummy/dummy/topics')
      .reply(200, { names: ['dummyTopic'] })

    // topics SHOULD NOT BE updated
    nock('https://api.github.com')
      .put('/repos/dummy/dummy/topics', () => {
        done(expect(false).toBeTruthy())
        return false
      })
      .reply(200)

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })
    await done()
  })

  test('repo is stale add stale topic', async (done) => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is stale
    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, queryResult)

    // simulate get topics
    nock('https://api.github.com')
      .get('/repos/dummy/dummy/topics')
      .reply(200, { names: ['dummyTopic'] })

    // topics updated and stale was removed
    nock('https://api.github.com')
      .put('/repos/dummy/dummy/topics', (body: any) => {
        done(expect(body.names).toMatchObject(['dummyTopic', 'stale']))

        return true
      })
      .reply(200)

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })
    await done()
  })

  test('repo stale nothing to add', async (done) => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is stale
    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, queryResult)

    // simulate get topics
    nock('https://api.github.com')
      .get('/repos/dummy/dummy/topics')
      .reply(200, { names: ['dummyTopic', 'stale'] })

    // topics SHOULD NOT BE updated
    nock('https://api.github.com')
      .put('/repos/dummy/dummy/topics', () => {
        done(expect(false).toBeTruthy())
        return false
      })
      .reply(200)

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })
    await done()
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
