import "./style.css";
import OpenAI from "openai";

// type ChatCompletion = OpenAI.Chat.ChatCompletion;

const handleSubmit = (event: SubmitEvent) => {
  event.preventDefault();
  const formData = new FormData(form);
  const content = formData.get("prompt") as string;

  if (!content) {
    alert("Please enter a prompt");
  } else {
    generate({ content });
  }
};
const form = document.querySelector("form") as HTMLFormElement;
form.addEventListener("submit", handleSubmit);
const iframe = document.querySelector("#generate-code") as HTMLIFrameElement;

const client = new OpenAI({
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

async function generate({ content }: { content: string }) {
  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Tu crées un site web avec Tailwind.
                  Ta tâche est de générer du le bloc HTML représentant la demande de l'utilisateur avec Tailwind.
                  Tu renvoie uniquement les balises sans aucun texte avant ou après.
                  Tu renvoie du HTML valide.
                  Tu ne me retourne le contenu sans markdown ni autres syntaxes.
                  je ne veux pas la spécification CSS ni les backticks.
                `,
      },
      {
        role: "user",
        content,
      },
    ],
    model: "gpt-4o",
    stream: true,
  });

  console.log({ chatCompletion });

  // const code = chatCompletion.choices.at(0)?.message.content;

  // if (!chatCompletion) {
  //   alert("No code generated");
  //   return;
  // }

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
    console.log({ chunk });
    code += token;
    if (isDone) {
      break;
    }
    onNewChunk(code);
  }
}
