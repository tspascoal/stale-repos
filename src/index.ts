import { Application } from 'probot' // eslint-disable-line no-unused-vars

import { Stale } from './stale'

export = (app: Application) => {
  const intervalHours = parseFloat(process.env.INTERVAL_HOURS || '24')
  const staleTopic = (process.env.STALE_TOPIC || 'stale').toLowerCase()
  const inactivityThresholdHours = parseFloat(process.env.STALE_THRESHOLD_HOURS || '4320')
  const archiveThresholdHours = parseFloat(process.env.ARCHIVE_THRESHOLD_HOURS || '8760')

  app.log.info(`Going to be called at an interval of ${intervalHours} hours`)
  app.log.info(`Stale threshold ${inactivityThresholdHours} hours`)
  app.log.info(`Archive threshold ${archiveThresholdHours} hours`)

  if (!process.env.SKIP_SCHEDULER) {
    const createScheduler = require('probot-scheduler')

    // be careful this is called every interval for EACH repo
    createScheduler(app, {
      delay: true,
      interval: intervalHours * 60 * 60 * 1000 // convert hours to milliseconds
    })
  }

  app.on('schedule.repository', async (context) => {
    const stale = new Stale(context.github, staleTopic, context.repo().owner, context.repo().repo, context.log)

    // HACK: Inject mock date for tests
    stale.setMockDate(context.payload.__mockNow)

    const queryResult = await stale.getRepoActivity()

    if (!stale.isRepoActive(queryResult)) {
      return
    }

    const lastUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult)

    if (inactivityThresholdHours > 0) {
      const isStale = stale.hasExceededThreshold(lastUpdate, inactivityThresholdHours)

      const repoTopics = await stale.getRepoTopics()

      await stale.updateRepoTopics(isStale, repoTopics)
    }

    if (archiveThresholdHours > 0) {
      const shouldBeArchived = stale.hasExceededThreshold(lastUpdate, archiveThresholdHours)

      await stale.archiveRepo(shouldBeArchived)
    }
  })
}
