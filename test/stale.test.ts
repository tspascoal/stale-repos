import { Logger } from 'probot'

import { Stale } from '../src/stale'

import clone from 'clone'

import MockDate from 'mockdate'

import { RepoActivity } from '../src/RepoActivity' // eslint-disable-line no-unused-vars

import activeQueryResult from './fixtures/query-active.json'
import archivedQueryResult from './fixtures/query-archive.json'
import disabledQueryResult from './fixtures/query-disabled.json'
import lockedQueryResult from './fixtures/query-locked.json'

describe('stale repo Stale tests', () => {
  let stale: Stale

  beforeEach(() => {
    const dummy: any = {}

    MockDate.reset()

    stale = new Stale(dummy.github, 'stale', 'dummy', 'dummy', new Logger({ name: 'dummy', level: 100 }))
  })

  test('has stale topic', () => {
    const hasStale = stale.hasStaleTopic(['stale', 'dummy'])

    expect(hasStale).toBeTruthy()
  })

  test('has no stale topic', () => {
    const hasStale = stale.hasStaleTopic(['critical', 'topic2'])

    expect(hasStale).toBeFalsy()
  })

  test('has no stale no topics', () => {
    const hasStale = stale.hasStaleTopic([])

    expect(hasStale).toBeFalsy()
  })

  test('is repo active', () => {
    const isActive = stale.isRepoActive(activeQueryResult.data)

    expect(isActive).toBeTruthy()
  })

  test('is repo not active - archived', () => {
    const isActive = stale.isRepoActive(archivedQueryResult.data)

    expect(isActive).toBeFalsy()
  })

  test('is repo not active - disabled', () => {
    const isActive = stale.isRepoActive(disabledQueryResult.data)

    expect(isActive).toBeFalsy()
  })

  test('is repo not active - locked', () => {
    const isActive = stale.isRepoActive(lockedQueryResult.data)

    expect(isActive).toBeFalsy()
  })

  test('getElapsedTimeSinceLastUpdate - current time (mocked)', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    queryResult.repository.pushedAt = new Date(2000, 1, 1, 14, 0, 0)
    queryResult.repository.pullRequests.nodes.pop()
    queryResult.repository.issues.nodes.pop()

    MockDate.set(new Date(2000, 1, 1, 14, 1, 0))

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult)

    expect(timeSinceLatUpdate).toEqual(60)
  })

  test('get elapsed time since last update - pushedAt', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    const currentTime = new Date(2020, 7, 30, 13, 0, 0, 0)

    queryResult.repository.pushedAt = new Date(2020, 7, 30, 10, 0, 0, 0)

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult, currentTime)

    expect(timeSinceLatUpdate).toEqual(10800)
  })

  test('get elapsed time since last update - issue', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    const currentTime = new Date(2020, 7, 29, 13, 0, 0, 0)

    queryResult.repository.issues.nodes[0].updatedAt = new Date(2020, 7, 29, 11, 0, 0, 0)

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult, currentTime)

    expect(timeSinceLatUpdate).toEqual(7200)
  })

  test('get elapsed time since last update - pull request', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    const currentTime = new Date(2020, 7, 28, 13, 0, 0, 0)

    queryResult.repository.pullRequests.nodes[0].updatedAt = new Date(2020, 7, 28, 12, 0, 0, 0)

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult, currentTime)

    expect(timeSinceLatUpdate).toEqual(3600)
  })

  test('get elapsed time since last update - no pull request no issues', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    const currentTime = new Date(2018, 7, 30, 13, 0, 0, 0)

    queryResult.repository.pullRequests.nodes.pop()
    queryResult.repository.issues.nodes.pop()
    queryResult.repository.pushedAt = new Date(2018, 7, 30, 12, 0, 0, 0)

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult, currentTime)

    expect(timeSinceLatUpdate).toEqual(3600)
    expect(queryResult.repository.pullRequests.nodes.length).toEqual(0)
    expect(queryResult.repository.issues.nodes.length).toEqual(0)
  })

  test('repo not stale', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    queryResult.repository.pushedAt = new Date(2018, 7, 30, 12, 30, 0, 0)
    const currentTime = new Date(2018, 7, 30, 13, 0, 0, 0)

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult, currentTime)

    const isStale = stale.isRepoStale(timeSinceLatUpdate, 1) // 1 hour

    expect(isStale).toBeFalsy()
  })

  test('repo stale', () => {
    const queryResult = clone((<RepoActivity><unknown>activeQueryResult).data)

    queryResult.repository.pushedAt = new Date(2018, 7, 30, 10, 0, 0, 0)
    const currentTime = new Date(2018, 7, 30, 13, 0, 0, 0)

    const timeSinceLatUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult, currentTime)

    const isStale = stale.isRepoStale(timeSinceLatUpdate, 1) // 1 hour

    expect(isStale).toBeFalsy()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
