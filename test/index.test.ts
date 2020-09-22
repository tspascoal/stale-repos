import nock from 'nock'
import staleRepoApp from '../src'

import { Probot } from 'probot'

import clone from 'clone'

// Requiring our fixtures
import schedulePayload from './fixtures/schedule.repository.json'
import activeQueryResult from './fixtures/query-active.json'
import disabledQueryResult from './fixtures/query-disabled.json'
import { RepoActivity } from '../src/RepoActivity' // eslint-disable-line no-unused-vars
import fs from 'fs'
import path from 'path'
import { addGraphQLQueryMock, addGetTopicsMock, addUpdateTopicMockAndExpect, addUpdateTopicMockFailIfCalledExpect, addArchiveMockFailIfCalledExpect, getPayloadWithMockDate, addArchiveRepoMockExpect } from './testsHelpers'

describe('stale repo bot', () => {
  let probot: any
  let mockCert: string

  beforeAll(async () => {
    const mockCertContent = fs.readFileSync(path.join(__dirname, 'fixtures/mock-cert.pem'))
    mockCert = mockCertContent.toString()
  })

  beforeEach(() => {
    nock.disableNetConnect()
    jest.clearAllMocks()

    process.env.SKIP_SCHEDULER = 'true'
    delete process.env.STALE_TOPIC
    delete process.env.STALE_THRESHOLD_HOURS
    delete process.env.ARCHIVE_THRESHOLD_HOURS

    probot = new Probot({ id: 123, cert: mockCert })
    probot.load(staleRepoApp)
  })

  test('repo not stale remove stale topic', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is not stale
    queryResult.data.repository.pushedAt = new Date()

    addGraphQLQueryMock(queryResult)
    addGetTopicsMock(['dummyTopic', 'stale'])

    // topics updated and stale was removed
    addUpdateTopicMockAndExpect(['dummyTopic'])

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })
  })

  test('repo not stale nothing to remove', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is not stale
    queryResult.data.repository.pushedAt = new Date()

    addGraphQLQueryMock(queryResult)
    addGetTopicsMock(['dummyTopic'])

    // topics SHOULD NOT BE updated
    addUpdateTopicMockFailIfCalledExpect()

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })
  })

  test('repo is stale add stale topic but no archive', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is stale
    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    addGraphQLQueryMock(queryResult)
    addGetTopicsMock(['dummyTopic'])

    // topics updated and stale was added
    addUpdateTopicMockAndExpect(['dummyTopic', 'stale'])

    // archive SHOULD NOT BE CALLED
    addArchiveMockFailIfCalledExpect()

    await probot.receive(
      {
        name: 'schedule.repository',
        payload: getPayloadWithMockDate(schedulePayload, new Date(2000, 7, 1, 1, 0))
      })

    expect(nock.pendingMocks().length).toBe(1) // Archive call is still pending.
  })

  test('repo is stale add stale (alternate) topic but no archive', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is stale
    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    process.env.STALE_TOPIC = 'staleAlternate'
    process.env.STALE_THRESHOLD_HOURS = '0'
    process.env.ARCHIVE_THRESHOLD_HOURS = '0'
    const probot: any = new Probot({ id: 123, cert: mockCert })
    probot.load(staleRepoApp)

    addGraphQLQueryMock(queryResult)
    addGetTopicsMock(['dummyTopic'])

    // topics updated and stale was added
    addUpdateTopicMockAndExpect(['dummyTopic', 'staleAlternate'])

    // archive SHOULD NOT BE CALLED
    addArchiveMockFailIfCalledExpect()

    await probot.receive(
      {
        name: 'schedule.repository',
        payload: getPayloadWithMockDate(schedulePayload, new Date(2000, 8, 1, 1, 0))
      })

    expect(nock.pendingMocks().length).toBe(3) // Pending: GetTopis, Update Topic and Archive
  })

  test('repo stale nothing to add and no archive', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is stale
    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    addGraphQLQueryMock(queryResult)
    addGetTopicsMock(['dummyTopic', 'stale'])

    // Topics and archive should not be called
    addUpdateTopicMockFailIfCalledExpect()
    addArchiveMockFailIfCalledExpect()

    await probot.receive(
      {
        name: 'schedule.repository',
        payload: getPayloadWithMockDate(schedulePayload, new Date(2000, 7, 1, 1, 0))
      })

    // update topics was not called and archive neither, so 2 pending mock calls.
    expect(nock.pendingMocks().length).toBe(2)
  })

  test('repo stale nothing to add but archive', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))
    // patch pushed at so repo is stale
    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    addGraphQLQueryMock(queryResult)
    addGetTopicsMock(['dummyTopic', 'stale'])

    // topics SHOULD NOT BE updated
    addUpdateTopicMockFailIfCalledExpect()

    // archive
    addArchiveRepoMockExpect()

    await probot.receive(
      {
        name: 'schedule.repository',
        payload: getPayloadWithMockDate(schedulePayload, new Date(2001, 2, 1, 1, 0))
      })

    // update topics was not called, so 1 pending mock calls.
    expect(nock.pendingMocks().length).toBe(1)
  })

  test('repo not active - disabled', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>disabledQueryResult))

    addGraphQLQueryMock(queryResult)
    // topics and archive SHOULD NOT BE updated
    addUpdateTopicMockFailIfCalledExpect()
    addArchiveMockFailIfCalledExpect()

    await probot.receive({ name: 'schedule.repository', payload: schedulePayload })

    // update topics was not called, so 1 pending mock calls.
    expect(nock.pendingMocks().length).toBe(2)
  })

  test('skip stale checks', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))

    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    // Specific inplementation to override parameters
    process.env.STALE_THRESHOLD_HOURS = '0'
    const probot: any = new Probot({ id: 123, cert: mockCert })
    probot.load(staleRepoApp)

    addGraphQLQueryMock(queryResult)
    // topics and archive SHOULD NOT BE updated
    addUpdateTopicMockFailIfCalledExpect()
    addArchiveMockFailIfCalledExpect()

    await probot.receive(
      {
        name: 'schedule.repository',
        payload: getPayloadWithMockDate(schedulePayload, new Date(2000, 2, 1, 1, 0))
      })

    // update topics was not called, so 1 pending mock calls.
    expect(nock.pendingMocks().length).toBe(2)
  })

  test('skip stale and archive checks', async () => {
    // simulate graphql query
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult))

    queryResult.data.repository.pushedAt = new Date(2000, 1, 1, 1, 0)
    queryResult.data.repository.pullRequests.nodes.pop()
    queryResult.data.repository.issues.nodes.pop()
    expect(queryResult.data.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.data.repository.issues.nodes.length).toEqual(0)

    // Specific inplementation to override parameters
    process.env.STALE_THRESHOLD_HOURS = '0'
    process.env.ARCHIVE_THRESHOLD_HOURS = '0'
    const probot: any = new Probot({ id: 123, cert: mockCert })
    probot.load(staleRepoApp)

    addGraphQLQueryMock(queryResult)
    // topics and archive SHOULD NOT BE updated
    addUpdateTopicMockFailIfCalledExpect()
    addArchiveMockFailIfCalledExpect()

    await probot.receive(
      {
        name: 'schedule.repository',
        payload: getPayloadWithMockDate(schedulePayload, new Date(2020, 2, 1, 1, 0))
      })

    // update topics was not called, so 1 pending mock calls.
    expect(nock.pendingMocks().length).toBe(2)
  })

  // TODO: add when we have a good way to detect the scheduler
  // test('scheduler loaded', async () => {
  //   delete process.env.SKIP_SCHEDULER
  //   process.env.INTERVAL_HOURS = 1/3600
  //   const tempprobot = new Probot({ id: 123, cert: mockCert })
  //   tempprobot.load(staleRepoApp)

  //   // TODO: how to check if loaded
  // })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})
