# CurreChat

UI and access management wrapper for Azure OpenAI service.

## Development

- Install npm, docker and docker compose
- Clone the repository
- Copy `.env.template` as `.env` file and fill in the required values
- Run `npm i` and `npm start` to setup and start the development environment

### Things to know

The terms `course` and `chatInstance` refer to the same thing in the codebase. However, only `chatInstance` is correct, always prefer it.

### Troubleshooting

Getting `Error: Cannot find module @rollup/rollup-linux-arm64-musl` on MacOS?
This is likely because you ran `npm i` locally.
Try removing package-lock.json locally and running
```
docker compose build
```

If then you're getting `concurrently not found`, prepend the `npm run dev` script with `npm i` and run once with that.
