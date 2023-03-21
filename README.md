# GPTwrapper

Wrapper to handle OpenAI API calls and access management

## Usage

e.g. `POST /v0/chat`

```json
{
  "id": "exampleService",
  "options": {
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant for the University of Helsinki."
      },
      {
        "role": "user",
        "content": "Hello."
      }
    ]
  }
}
```

OpenAI API documentation: https://platform.openai.com/docs/introduction

For `options` values see https://platform.openai.com/docs/api-reference/completions/create

## Services

Create a new service by updating `services.jsonc` [here](./services.jsonc).

e.g.

```json
{
  "id": "exampleService",
  "name": "Example Service",
  "description": "This is an example service",
  "usageLimit": 10
}
```

## Development

- Install npm, docker and docker compose
- Clone the repository
- Copy `.env.template` as `.env` file and fill in the required values
- Run `npm i` and `npm start` to setup and start the development environment
