# Stale Repos

> A GitHub App built with [Probot](https://github.com/probot/probot) to help you find stale repos in an easy fashion.

The bot scans your reps in regular intervals (default is once a day) and if they lack activity for a configurable amount of time they will be marked as staled.

Pushes to the repo, creating or update issues or pull requests are considered activity.

When a repository is considered stale, a [topic](https://docs.github.com/en/github/administering-a-repository/classifying-your-repository-with-topics) is added to the repository so you can easily find all stale repos by [searching](https://docs.github.com/en/github/searching-for-information-on-github/searching-topics) for repos who have the `stale`

If a repository has been marked as stale and there is activity after that the application automatically removes the stale topic as well (this is not done in real time, so it may take a few hours for the topic to be removed)

> This is just a sample application, it is not offered as a service so if you wish to use it then you need to host it yourself

## Setup

```sh
# Install dependencies
npm install

# Run with hot reload
npm run build:watch

# Compile and run
npm run build
npm run start
```

### Configuring the application

The application is only provided in source code form as a sample, you need to register and host it yourself.

The application can be registered manually or using the provided [application manifest](app.yml).

Learn how to register the [application](https://docs.github.com/en/developers/apps/creating-a-github-app-from-a-manifest)

> Note: The manifest marks the application as **private**, so it can be installed by the application onwer on it's own repos, if you are installing it on your own private server then it's better if you make it public.

If you are going to register the application manually these are the required permissions

* **administration** -  read & write (required to manage a repo topics)
* **contents** - read
* **issues** - read
* **metadata** - read
* **pull requests** - read

#### Configuration settings

The application has the following parameters (they are configure as environment variables)

* STALE_TOPIC (optional, default value `stale`) The name of the topic that is used to mark stale repo.
* INACTIVITY_HOURS (optional, default 4320 (180 days))) The maximum time of hours a repo can be inactive until it is considered stale.
* INTERVAL_HOURS (optional, default 24 hours) - At which interval should the repo(s) be scanned (either to mark or unmark them as stale)
* GHE_HOST (optional, defaults to github.com)

#### Installation

After the application has been configured and running you will need to install it on the repo(s) or organizations that you want to check for staleness

### Learning More

If you wish to learn more about GitHub Applications you can learn more at [Getting Started with apps](https://docs.github.com/en/developers/apps/getting-started-with-apps)

## Contributing

If you have suggestions for how stale-repo could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2020 Tiago Pascoal <tiago@pascoal.net>
