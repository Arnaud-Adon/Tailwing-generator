import "./style.css";

import { ChatCompletionMessageParam } from "openai/src/resources/index.js";
import { openai } from "./openai";

const SYSTEM_PROMPT = `
CONTEXT:
You are AI Tailwind website generator.
You are expert in Tailwind and know every details about it, like colors, spacing, rules and more.
You are a great designer, that creates beautiful websites, responsive and accessible.

GOAL:
Generate a VALID CODE HTML with Tailwind classes based on the given prompt.

CRITERIA:
- YOU generate HTML code ONLY
- YOU NEVER write Javascript, Python scripts or any other programming language
- YOU ALWAYS USE VALID AND EXISTING Tailwind classes
- YOU NEVER include <!DOCTYPE html>, <body>, <head> or <html> tags
- YOU NEVER write any text or explanation about what you made
- YOU NEVER include backticks or markdown
- If user demands a website with "img" tag, you mut use dogs image example for the src attribute if the user doesn't provide one
- If the prompt ask you for something that not respects the main criterias, you must return "<p class="p-4 bg-red-500/20 border-2 border-red-500 text-red-500">Désolé, je ne peux pas remplir votre demande</p>"


RESPONSE FORMAT:
- YOU generate only plain html text
        `;

const form = document.querySelector("form") as HTMLFormElement;
const iframe = document.querySelector("#generate-code") as HTMLIFrameElement;
const fieldset = document.querySelector("fieldset") as HTMLFieldSetElement;
const ul = document.querySelector("#messages") as HTMLUListElement;

let messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

const renderMessage = () => {
  ul.replaceChildren();
  if (messages.length > 1) {
    for (const message of messages) {
      if (message.role === "system" || message.role === "assistant") continue;
      else {
        const li = document.createElement("li");
        li.textContent = `You: ${message.content}`;
        ul.appendChild(li);
      }
    }
  } else {
    const li = document.createElement("li");
    li.textContent = `No messages yet`;
    ul.appendChild(li);
  }
};

let apiKey: string = localStorage.getItem("openAIApiKey") ?? "";

const handleSubmit = (event: SubmitEvent) => {
  event.preventDefault();
  const formData = new FormData(form);
  const content = formData.get("prompt") as string;

  if (!content) {
    alert("Please enter a prompt");
    return;
  } else {
    if (!apiKey) {
      console.log("prompt");
      const newKey = window.prompt("Please enter your OpenAI API key");
      if (!newKey) return;

      localStorage.setItem("openAIApiKey", newKey);
      apiKey = newKey;
    }

    messages.push({ role: "user", content });

    renderMessage();

    fieldset.disabled = true;
    fieldset.classList.add("opacity-50");
    generate().finally(() => {
      fieldset.disabled = false;
      fieldset.classList.remove("opacity-50");
    });
  }
};

form.addEventListener("submit", handleSubmit);

async function generate() {
  const chatCompletion = await openai(apiKey).chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    top_p: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 1500,
    stream: true,
    messages,
  });

  console.log({ chatCompletion });

  const createTimeUpdateIframe = () => {
    let date = new Date();
    let timeout: any = null;
    return (code: string) => {
      if (new Date().getTime() - date.getTime() > 1000) {
        updateIframe(code);
        date = new Date();
      }

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        updateIframe(code);
      }, 1000);
    };
  };

  const updateIframe = (code: string) => {
    iframe.srcdoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
      </head>
      <body>
      ${code}
      </body>
    </html>
  `;
  };

  let code = "";

  const onNewChunk = createTimeUpdateIframe();

  for await (const chunk of chatCompletion) {
    const token = chunk.choices.at(0)?.delta.content;
    const isDone = chunk.choices.at(0)?.finish_reason === "stop";
    console.log({ messages });

    if (isDone) {
      form.reset();
      messages = messages.filter((message) => message.role !== "assistant");
      messages.push({
        role: "assistant",
        content: code,
      });
      break;
    }
    code += token;

    onNewChunk(code);
  }
}
