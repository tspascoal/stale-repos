import { Application } from 'probot' // eslint-disable-line no-unused-vars

import { Stale } from './stale'

const createScheduler = require('probot-scheduler')

export = (app: Application) => {
  const intervalHours = parseFloat(process.env.INTERVAL_HOURS || '24')
  const staleTopic = process.env.STALE_TOPIC || 'stale'
  const inactivityThresholdHours = parseFloat(process.env.INACTIVITY_HOURS || '4320')

  app.log.info(`Going to be called at an inverval of ${intervalHours} hours`)
  app.log.info(`Stale report threshold ${inactivityThresholdHours} hours`)

  // be careful this is called every interval for EACH repo
  createScheduler(app, {
    delay: true,
    interval: intervalHours * 60 * 60 * 1000 // convert hours to milliseconds
  })

  app.on('schedule.repository', async (context) => {
    const stale = new Stale(context.github, staleTopic, context.repo().owner, context.repo().repo, context.log)

    const queryResult = await stale.getRepoActivity()

    if (!stale.isRepoActive(queryResult)) {
      return
    }

    const lastUpdate = stale.getElapsedTimeSinceLastUpdate(queryResult)

    const isStale = stale.isRepoStale(lastUpdate, inactivityThresholdHours)

    const repoTopics = await stale.getRepoTopics()

    await stale.updateRepoTopics(isStale, repoTopics)
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
