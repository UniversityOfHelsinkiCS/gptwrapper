import { DEFAULT_VERTEX_LOCATION, ModelConfig, ModelProvider, validModels } from '@config'
import express from 'express'
import { randomBytes } from 'node:crypto'
import logger from '../../util/logger'
import { AIMessageChunk } from 'langchain'
import { ChatOpenAI } from '@langchain/openai'
import { AZURE_API_KEY, AZURE_RESOURCE, GOOGLE_CLOUD_PROJECT_ID } from 'src/server/util/config'
import { ChatGoogle } from '@langchain/google'
import { ApiKey, User } from '../../db/models'
import { checkUsage, getUserTokenLimit, incrementUsage } from 'src/server/services/chatInstances/usage'
import type { User as UserType } from '../../../shared/user'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages"

export const api = express.Router()

const UNLIMITED_MODELS = new Set(["gpt-5-mini"]) // "DeepSeek-V4-Flash", "gpt-6-luna"

export const getAzureChatOpenAI = (modelName: string, streaming = true, temperature: number | undefined, topP: number | undefined, _top_k: number | undefined, logprobs: boolean = false) =>
    new ChatOpenAI({
        model: modelName,
        configuration: {
            baseURL: `https://${AZURE_RESOURCE}.services.ai.azure.com/openai/v1`
        },
        useResponsesApi: true,
        apiKey: AZURE_API_KEY,
        streaming: streaming,
        temperature,
        topP,
        logprobs: logprobs,
        topLogprobs: 5
    })

export const getVertexModelProvider = (modelConfig: Pick<ModelConfig, 'name' | 'modelRegion'>, streaming = true, temperature, topP, topK, logprobs: boolean = false) => {
    return new ChatGoogle({
        model: modelConfig.name,
        platformType: 'gcp',
        location: modelConfig.modelRegion || DEFAULT_VERTEX_LOCATION,
        temperature: temperature,
        topK: topK,
        topP: topP,
        logprobs: logprobs ? 20 : undefined,
        disableStreaming: !streaming,
        ...(GOOGLE_CLOUD_PROJECT_ID ? { googleAuthOptions: { projectId: GOOGLE_CLOUD_PROJECT_ID } } : {}),
    })
}


const getModel = (modelConfig, streaming, temperature, topP, topK, logprobs) => {
    switch (modelConfig.provider) {
        case ModelProvider.Azure: {
            return getAzureChatOpenAI(modelConfig.name, streaming, temperature, topP, topK, logprobs)
        }
        case ModelProvider.Vertex: {
            return getVertexModelProvider(modelConfig, streaming, temperature, topP, topK, logprobs)
        }
        default:
            throw new Error(`Unknown model provider: ${modelConfig.provider}`)
    }
}



// These routes are NOT protected by shibboleth, so be careful and do not trust headers

api.use(async (req: any, res: any, next: any) => {
    if (req.headers.authorization) {

        const key = req.headers.authorization.replace("Bearer ", "")

        const apiKey = await ApiKey.findOne({
            where: { apiKey: key },
        })

        if (apiKey?.userId) {

            const user = await User.findByPk(apiKey?.userId)

            if (user) {
                req.user = user.toJSON()
                next()
                return
            }
        }
    }

    res.status(401).send("Unauthorized")
})

api.get('/v1/models',
    async (_req, res) => {
        const models = validModels.filter(model => model.name != "mock").map(model => {
            return {
                id: model.name,
                object: "model",
                created: 0,
                owned_by: "currechat"
            }
        })

        res.send({
            object: "list",
            data: models
        })
    }
)


api.get('/v1/models/:model',
    async (req, res) => {
        const modelName = req.params.model

        const matching = validModels.find(model => (model.name != "mock") && (model.name == modelName))

        if (!matching) {
            res.status(404).send({
                error: {
                    "code": "model_not_found",
                    "type": "invalid_request_error",
                    "param": null,
                    "message": "Model not found"
                }
            })
            return
        }

        res.send({
            id: matching.name,
            object: 'model',
            created: 0,
            owned_by: 'currechat'
        })
    }
)

api.post('/v1/chat/completions',
    async (req, res) => {
        const { model, messages, stream, logprobs, top_p, top_k, temperature, tools, tool_choice } = req.body

        //@ts-expect-error middleware makes sure req.user is defined
        const user = req.user as unknown as UserType

        const matching = validModels.find(modelObj => (modelObj.name != "mock") && (modelObj.name == model))

        if (!matching) {
            res.status(404).send({
                error: {
                    "code": "model_not_found",
                    "type": "invalid_request_error",
                    "param": "model",
                    "message": "Model not found"
                }
            })
            return
        }

        const userLimit = await getUserTokenLimit(user)

        if (UNLIMITED_MODELS.has(model)) {
            if (!checkUsage(user, model, userLimit + 1000000)) {
                logger.info(`RATELIMIT: ${user.id}, ${user.usage}, ${model} limited for "unlimited" model`)
                res.status(429).send({
                    error: {
                        "code": "slow_down",
                        "type": "rate_limit_error",
                        "param": null,
                        "message": "Token limit exceeded on model, limits automatically reset on every monday"
                    }
                })
                return
            }
        }
        else {
            if (!checkUsage(user, model, userLimit)) {
                logger.info(`RATELIMIT: ${user.id}, ${user.usage}, ${model} limited for normal models`)
                res.status(429).send({
                    error: {
                        "code": "slow_down",
                        "type": "rate_limit_error",
                        "param": null,
                        "message": "Token limit exceeded on model, limits automatically reset on every monday"
                    }
                })
                return
            }
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.status(400).send({
                error: {
                    "code": "missing_required_parameter",
                    "type": "invalid_request_error",
                    "param": "messages",
                    "message": "Messages is required"
                }
            })
            return
        }

        const id = "chatcmpl-" + randomBytes(8).toString("hex");
        const created = Math.floor(Date.now() / 1000);

        const chatModel = getModel(matching, stream, temperature, top_p, top_k, logprobs)

        let runnable: any = chatModel

        // pass the requested tools through to model
        if (Array.isArray(tools) && tools.length > 0) {
            runnable = chatModel.bindTools(tools, tool_choice ? { tool_choice } : undefined)
        }

        if (stream) {
            res.set({
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });
            res.flushHeaders()
            res.socket?.setNoDelay(true)
        }

        // utility used for sending stream chunks
        const send = (delta, finish_reason: any = null) =>
            res.write(
                "data: " +
                JSON.stringify({
                    id,
                    object: "chat.completion.chunk",
                    created,
                    model,
                    choices: [{ index: 0, delta, finish_reason }],
                }) +
                "\n\n"
            );


        const safeParse = (s: string) => { try { return JSON.parse(s || "{}") } catch { return {} } }

        const toLangChain = (m: any) => {
            switch (m.role) {
                case "system":
                case "developer":
                    return new SystemMessage({ content: m.content })
                case "assistant":
                    return new AIMessage({
                        content: m.content ?? "",
                        tool_calls: (m.tool_calls ?? []).map((tc: any) => ({
                            id: tc.id,
                            name: tc.function.name,
                            args: safeParse(tc.function.arguments),
                            type: "tool_call" as const,
                        })),
                    })
                case "tool":
                    return new ToolMessage({ content: m.content, tool_call_id: m.tool_call_id })
                default:
                    return new HumanMessage({ content: m.content })
            }
        }


        const upstream = await runnable.stream(messages.map(toLangChain))

        let full: AIMessageChunk | undefined;

        let textLength = 0

        let sentRole = false

        try {

            for await (const chunk of upstream) {
                const delta: any = {}
                if (!sentRole) { delta.role = "assistant"; sentRole = true }
                if (chunk.text) delta.content = chunk.text

                if (chunk.tool_call_chunks?.length) {
                    delta.tool_calls = chunk.tool_call_chunks.map((tc: any) => ({
                        index: tc.index ?? 0,
                        ...(tc.id ? { id: tc.id, type: "function" } : {}),
                        function: {
                            ...(tc.name ? { name: tc.name } : {}),
                            arguments: tc.args ?? "",
                        },
                    }))
                }

                if (stream) send(delta)
                if (chunk?.text) textLength += chunk.text.length
                full = full ? full.concat(chunk) : chunk;
            }
        }
        catch (e) {
            if (stream) {
                res.write("data: " + JSON.stringify({
                    object: 'error',
                    error: {
                        type: 'overloaded_error',
                        message: 'Upstream provider overloaded'
                    }
                }) + '\n\n')
                res.end()
            }
            else {
                res.status(429).send({
                    error: {
                        "code": "slow_down",
                        "type": "rate_limit_error",
                        "param": null,
                        "message": "Upstream error"
                    }
                })
            }
            logger.error(`User ${user.id} encountered upstream error ${JSON.stringify(e)}`)
            return

        }

        let tokens = 0
        if (full?.usage_metadata) {
            if (full?.usage_metadata?.output_tokens) tokens += full?.usage_metadata.output_tokens
            if (full?.usage_metadata?.input_tokens) tokens += full?.usage_metadata.input_tokens

            // Discount 70% of cached token read from total usage
            if (full?.usage_metadata?.input_token_details?.cache_read) tokens -= Math.round(full?.usage_metadata?.input_token_details?.cache_read * 0.70)

        }
        if (tokens <= 0) {
            logger.error(`Fallback token count on user ${user.id} and model ${model}`)
            tokens = textLength
        }

        await incrementUsage(user, tokens)

        const hasToolCalls = (full?.tool_calls?.length ?? 0) > 0
        const finishReason = hasToolCalls ? "tool_calls" : "stop"

        if (stream) {
            send({}, finishReason)
            res.write("data: [DONE]\n\n")
            return res.end()
        }
        else {
            const message: any = {
                role: "assistant",
                content: typeof full?.content === "string"
                    ? full.content
                    : (full?.content ?? []).map((b: any) => b.text ?? "").join(""),
                refusal: null,
            }
            if (hasToolCalls) {
                message.content = message.content || null
                message.tool_calls = full!.tool_calls!.map(tc => ({
                    id: tc.id,
                    type: "function",
                    function: { name: tc.name, arguments: JSON.stringify(tc.args) },
                }))
            }

            res.send({
                id,
                object: 'chat.completion',
                created,
                model,
                choices: [{ index: 0, message, finish_reason: finishReason }],
                usage: {
                    prompt_tokens: full?.usage_metadata?.input_tokens ? full?.usage_metadata?.input_tokens : 0,
                    completion_tokens: full?.usage_metadata?.output_tokens ? full?.usage_metadata?.output_tokens : 0,
                    total_tokens: tokens,
                    prompt_tokens_details: { cached_tokens: full?.usage_metadata?.input_token_details?.cache_read ? full?.usage_metadata?.input_token_details?.cache_read : 0 },
                    completion_tokens_details: { reasoning_tokens: 0 }
                }
            })
        }
    }
)