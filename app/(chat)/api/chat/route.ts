import {
  type Message,
  convertToCoreMessages,
  createDataStreamResponse,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import {
  insuranceCompany,
  insurancePlan,
  userInsurance,
} from "@/lib/db/schema";
import { customModel } from "@/lib/ai";
import { models } from "@/lib/ai/models";
import {
  codePrompt,
  systemPrompt,
  updateDocumentPrompt,
} from "@/lib/ai/prompts";
import {
  db,
  deleteChatById,
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

type AllowedTools = "createDocument" | "updateDocument" | "requestSuggestions";

const blocksTools: AllowedTools[] = [
  "createDocument",
  "updateDocument",
  "requestSuggestions",
];

const allTools: AllowedTools[] = [...blocksTools];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  const userMessageId = generateUUID();

  await saveMessages({
    messages: [
      { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
    ],
  });

  const userData = await db
    .select({
      plan: insurancePlan.name,
      plan_type: insurancePlan.type,
      company: insuranceCompany.name,
      details: userInsurance.detailsJson
    })
    .from(userInsurance)
    .leftJoin(insurancePlan, eq(userInsurance.planId, insurancePlan.id))
    .leftJoin(
      insuranceCompany,
      eq(insurancePlan.companyId, insuranceCompany.id)
    )
    .where(eq(userInsurance.userId, session.user.id ?? ""));
  const systemPromptWithData = `${systemPrompt}\n\n# Insurance data for ${
    session.user.email
  }\n${JSON.stringify(userData)}
  \n\n## Coverage
  - Doctor visits
  - Prescription medications
  - Emergency care
  - Preventive services
  - Hospital stays
  - Mental health care
  - Surgery
  - Physical therapy
  - Lab tests
  - Maternity care
  ## Clause
  The coverage provided under this policy is subject to the terms, conditions, and exclusions set forth herein. The insurer shall only be liable for costs incurred for medically necessary services, treatments, or procedures that are explicitly outlined in the Schedule of Benefits. Any expenses arising from excluded treatments, elective procedures, or services not preauthorized, where applicable, shall be the sole responsibility of the insured. The insurer reserves the right to deny claims for any treatments inconsistent with policy provisions or unsupported by appropriate documentation.
  `;
  console.log(systemPromptWithData);

  return createDataStreamResponse({
    execute: (dataStream) => {
      dataStream.writeData({
        type: "user-message-id",
        content: userMessageId,
      });

      const result = streamText({
        model: customModel(model.apiIdentifier),
        system: systemPromptWithData,
        messages: coreMessages,
        maxSteps: 5,
        experimental_activeTools: allTools,
        tools: {
          createDocument: {
            description:
              "Create a document for a writing activity. This tool will call other functions that will generate the contents of the document based on the title and kind.",
            parameters: z.object({
              title: z.string(),
              kind: z.enum(["text", "code"]),
            }),
            execute: async ({ title, kind }) => {
              const id = generateUUID();
              let draftText = "";

              dataStream.writeData({
                type: "id",
                content: id,
              });

              dataStream.writeData({
                type: "title",
                content: title,
              });

              dataStream.writeData({
                type: "kind",
                content: kind,
              });

              dataStream.writeData({
                type: "clear",
                content: "",
              });

              if (kind === "text") {
                const { fullStream } = streamText({
                  model: customModel(model.apiIdentifier),
                  system:
                    "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
                  prompt: title,
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "text-delta") {
                    const { textDelta } = delta;

                    draftText += textDelta;
                    dataStream.writeData({
                      type: "text-delta",
                      content: textDelta,
                    });
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              } else if (kind === "code") {
                const { fullStream } = streamObject({
                  model: customModel(model.apiIdentifier),
                  system: codePrompt,
                  prompt: title,
                  schema: z.object({
                    code: z.string(),
                  }),
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "object") {
                    const { object } = delta;
                    const { code } = object;

                    if (code) {
                      dataStream.writeData({
                        type: "code-delta",
                        content: code ?? "",
                      });

                      draftText = code;
                    }
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              }

              if (session.user?.id) {
                await saveDocument({
                  id,
                  title,
                  kind,
                  content: draftText,
                  userId: session.user.id,
                });
              }

              return {
                id,
                title,
                kind,
                content:
                  "A document was created and is now visible to the user.",
              };
            },
          },
          updateDocument: {
            description: "Update a document with the given description.",
            parameters: z.object({
              id: z.string().describe("The ID of the document to update"),
              description: z
                .string()
                .describe("The description of changes that need to be made"),
            }),
            execute: async ({ id, description }) => {
              const document = await getDocumentById({ id });

              if (!document) {
                return {
                  error: "Document not found",
                };
              }

              const { content: currentContent } = document;
              let draftText = "";

              dataStream.writeData({
                type: "clear",
                content: document.title,
              });

              if (document.kind === "text") {
                const { fullStream } = streamText({
                  model: customModel(model.apiIdentifier),
                  system: updateDocumentPrompt(currentContent),
                  prompt: description,
                  experimental_providerMetadata: {
                    openai: {
                      prediction: {
                        type: "content",
                        content: currentContent,
                      },
                    },
                  },
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "text-delta") {
                    const { textDelta } = delta;

                    draftText += textDelta;
                    dataStream.writeData({
                      type: "text-delta",
                      content: textDelta,
                    });
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              } else if (document.kind === "code") {
                const { fullStream } = streamObject({
                  model: customModel(model.apiIdentifier),
                  system: updateDocumentPrompt(currentContent),
                  prompt: description,
                  schema: z.object({
                    code: z.string(),
                  }),
                });

                for await (const delta of fullStream) {
                  const { type } = delta;

                  if (type === "object") {
                    const { object } = delta;
                    const { code } = object;

                    if (code) {
                      dataStream.writeData({
                        type: "code-delta",
                        content: code ?? "",
                      });

                      draftText = code;
                    }
                  }
                }

                dataStream.writeData({ type: "finish", content: "" });
              }

              if (session.user?.id) {
                await saveDocument({
                  id,
                  title: document.title,
                  content: draftText,
                  kind: document.kind,
                  userId: session.user.id,
                });
              }

              return {
                id,
                title: document.title,
                kind: document.kind,
                content: "The document has been updated successfully.",
              };
            },
          },
          requestSuggestions: {
            description: "Request suggestions for a document",
            parameters: z.object({
              documentId: z
                .string()
                .describe("The ID of the document to request edits"),
            }),
            execute: async ({ documentId }) => {
              const document = await getDocumentById({ id: documentId });

              if (!document || !document.content) {
                return {
                  error: "Document not found",
                };
              }

              const suggestions: Array<
                Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
              > = [];

              const { elementStream } = streamObject({
                model: customModel(model.apiIdentifier),
                system:
                  "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
                prompt: document.content,
                output: "array",
                schema: z.object({
                  originalSentence: z
                    .string()
                    .describe("The original sentence"),
                  suggestedSentence: z
                    .string()
                    .describe("The suggested sentence"),
                  description: z
                    .string()
                    .describe("The description of the suggestion"),
                }),
              });

              for await (const element of elementStream) {
                const suggestion = {
                  originalText: element.originalSentence,
                  suggestedText: element.suggestedSentence,
                  description: element.description,
                  id: generateUUID(),
                  documentId: documentId,
                  isResolved: false,
                };

                dataStream.writeData({
                  type: "suggestion",
                  content: suggestion,
                });

                suggestions.push(suggestion);
              }

              if (session.user?.id) {
                const userId = session.user.id;

                await saveSuggestions({
                  suggestions: suggestions.map((suggestion) => ({
                    ...suggestion,
                    userId,
                    createdAt: new Date(),
                    documentCreatedAt: document.createdAt,
                  })),
                });
              }

              return {
                id: documentId,
                title: document.title,
                kind: document.kind,
                message: "Suggestions have been added to the document",
              };
            },
          },
        },
        onFinish: async ({ response }) => {
          if (session.user?.id) {
            try {
              const responseMessagesWithoutIncompleteToolCalls =
                sanitizeResponseMessages(response.messages);

              await saveMessages({
                messages: responseMessagesWithoutIncompleteToolCalls.map(
                  (message) => {
                    const messageId = generateUUID();

                    if (message.role === "assistant") {
                      dataStream.writeMessageAnnotation({
                        messageIdFromServer: messageId,
                      });
                    }

                    return {
                      id: messageId,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    };
                  }
                ),
              });
            } catch (error) {
              console.error("Failed to save chat");
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: "stream-text",
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
