# CurreChat

LLM chat built for University of Helsinki staff and students, for education and research.

Some key features include:

- Access based on enrolments and staff role
- Custom system prompts managed by teachers
- Retrieval-augmented generation: teachers can bring their own source material for a course

## Development

- Install npm, docker and docker compose
- Clone the repository
- Copy `.env.template` as `.env` file and fill in the required values
- Run `npm i` and `npm start` to setup and start the development environment

## Azure setup

Create an AI foundry resource (or something) and create deployment for the models you want to use (gpt4.1 for example). 

Then populate .env with the following:
```
AZURE_RESOURCE=<name-of-the-resource-you-created>
AZURE_API_KEY=<asd>
GPT_41=<name-of-the-deployment-you-created>
```

## Developers: things to know

### Debugging in production

In browser console, run
```
toggleDevtools()
```

### Troubleshooting

Getting `Error: Cannot find module @rollup/rollup-linux-arm64-musl` on MacOS?
This is likely because you ran `npm i` locally.
Try removing package-lock.json locally and running
```
docker compose build
```

If then you're getting `concurrently not found`, prepend the `npm run dev` script with `npm i` and run once with that.

### Trivia

The terms `course` and `chatInstance` refer to the same thing in the codebase. However, only `chatInstance` is correct, always prefer it.
