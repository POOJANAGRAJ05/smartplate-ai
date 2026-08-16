import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* =========================================
   PATH SETUP
========================================= */

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const videosFolder = path.join(__dirname, "generated-videos");

if (!fs.existsSync(videosFolder)) {
    fs.mkdirSync(videosFolder, {
        recursive: true,
    });
}

/* =========================================
   GEMINI
========================================= */

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

/* =========================================
   SERVE GENERATED VIDEOS
========================================= */

app.use(
    "/generated-videos",
    express.static(videosFolder)
);

/* =========================================
   HOME
========================================= */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SmartPlate backend is running!",
    });
});

/* =========================================
   RECIPE GENERATION
========================================= */

async function generateRecipe(req, res) {
    try {
        const {
            ingredients,
            excludeRecipe,
        } = req.body;

        /* ---------- Validate input ---------- */

        if (!ingredients ||
            typeof ingredients !== "string" ||
            !ingredients.trim()
        ) {
            return res.status(400).json({
                error: "Ingredients are required.",
            });
        }

        /* =====================================
           EXCLUDE PREVIOUS RECIPE
        ===================================== */

        let exclusionText = "";

        if (
            excludeRecipe &&
            typeof excludeRecipe === "string" &&
            excludeRecipe.trim()
        ) {
            exclusionText = `
IMPORTANT:

The user already received this recipe:

"${excludeRecipe}"

DO NOT generate the same recipe again.

Generate a DIFFERENT recipe using the available ingredients.
Do not simply rename the same dish.
`;
        }

        /* =====================================
           SMARTPLATE PROMPT
        ===================================== */

        const prompt = `
You are SmartPlate, an AI cooking assistant designed
primarily for Indian households.

Create ONE realistic, practical recipe using the
ingredients provided by the user.

USER INGREDIENTS:
${ingredients}

${exclusionText}

IMPORTANT RECIPE RULES:

1. Prioritize familiar Indian home-style recipes when
   the provided ingredients are commonly used in
   Indian cooking.

2. Prefer simple everyday dishes that a typical Indian
   household could realistically prepare.

3. Avoid unnecessarily fancy, restaurant-style,
   gourmet, fusion, or complicated recipes.

4. Use as many of the user's provided ingredients as
   reasonably possible.

5. Do NOT force every ingredient into the recipe if
   doing so would make the dish unnatural.

6. You may add a small number of basic supporting
   ingredients commonly available in an Indian kitchen,
   such as salt, oil, turmeric, chilli powder, cumin,
   mustard seeds, coriander, ginger, garlic, garam
   masala, curry leaves, etc.

7. Do not introduce expensive, unusual, or hard-to-find
   ingredients unless genuinely necessary.

8. Use appropriate Indian cooking techniques when
   applicable, such as tempering, sautéing, pressure
   cooking, boiling, roasting, shallow frying, or
   simmering.

9. If the ingredients clearly belong to another cuisine,
   create a suitable recipe from that cuisine instead
   of unnecessarily Indianizing it.

10. The recipe should be something a person could
    realistically make at home.

11. Prefer recipes that are reasonably quick and easy.

12. Give realistic quantities and cooking times.

13. Avoid unrealistic ingredient combinations.

14. The final recipe should be practical, tasty,
    beginner-friendly, and suitable for a normal
    home kitchen.

15. Prefer familiar regional or common Indian dishes
    when the ingredient combination naturally supports them.

16. Do not unnecessarily rename familiar Indian dishes
    with fancy or artificial names.

17. If a simple dish such as upma, poha, pulao, dal,
    sabzi, curry, rice dish, roti-based dish,
    dosa-style preparation, or similar home-style
    preparation naturally fits the ingredients,
    prefer it over an invented fusion dish.

18. Use realistic Indian-style seasoning and quantities.

19. Cooking instructions must be clear enough for a
    beginner to follow.

20. Do not make the recipe unnecessarily complicated.

Return ONLY valid JSON.

Use exactly this structure:

{
  "name": "Recipe name",
  "description": "Short description of the dish",
  "servings": 2,
  "timeMinutes": 20,
  "difficulty": "Easy",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "quantity"
    }
  ],
  "steps": [
    {
      "step": 1,
      "instruction": "Clear cooking instruction"
    }
  ],
  "swaps": [
    {
      "ingredient": "ingredient to replace",
      "suggestions": [
        "alternative 1",
        "alternative 2"
      ]
    }
  ]
}

Do not include markdown.
Do not include code fences.
Do not include explanations outside the JSON.
`;

        /* =====================================
           CALL GEMINI
        ===================================== */

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        const recipeText = response.text;

        console.log("");
        console.log("==============================");
        console.log("RAW GEMINI RESPONSE:");
        console.log(recipeText);
        console.log("==============================");
        console.log("");

        /* =====================================
           EMPTY RESPONSE
        ===================================== */

        if (!recipeText) {
            return res.status(502).json({
                error: "The AI returned an empty response.",
            });
        }

        /* =====================================
           PARSE JSON
        ===================================== */

        let recipe;

        try {
            let cleanedText = recipeText.trim();

            if (cleanedText.startsWith("```")) {
                cleanedText = cleanedText
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();
            }

            recipe = JSON.parse(cleanedText);

        } catch (parseError) {
            console.error(
                "Recipe JSON parse error:",
                parseError
            );

            console.error(
                "Gemini returned:",
                recipeText
            );

            return res.status(502).json({
                error: "The AI returned recipe data in an unexpected format.",
            });
        }

        /* =====================================
           VALIDATE RECIPE
        ===================================== */

        if (!recipe ||
            typeof recipe !== "object"
        ) {
            return res.status(502).json({
                error: "The AI returned an invalid recipe.",
            });
        }

        if (!recipe.name) {
            return res.status(502).json({
                error: "The AI recipe is missing a name.",
            });
        }

        if (!recipe.description) {
            return res.status(502).json({
                error: "The AI recipe is missing a description.",
            });
        }

        if (!Array.isArray(recipe.ingredients)) {
            return res.status(502).json({
                error: "The AI recipe is missing ingredients.",
            });
        }

        if (!Array.isArray(recipe.steps)) {
            return res.status(502).json({
                error: "The AI recipe is missing cooking steps.",
            });
        }

        if (!Array.isArray(recipe.swaps)) {
            recipe.swaps = [];
        }

        /* =====================================
           SUCCESS
        ===================================== */

        console.log(
            `Recipe generated successfully: ${recipe.name}`
        );

        return res.json(recipe);

    } catch (error) {
        console.error(
            "Gemini recipe error:",
            error
        );

        let errorMessage =
            "Unable to generate recipe right now.";

        if (error && error.message) {
            errorMessage = error.message;
        }

        return res.status(500).json({
            error: errorMessage,
        });
    }
}

/* =========================================
   NORMAL RECIPE API
========================================= */

app.post(
    "/api/recipe",
    generateRecipe
);

/* =========================================
   ANOTHER RECIPE API
========================================= */

app.post(
    "/api/another-recipe",
    generateRecipe
);

/* =========================================
   FULL RECIPE VIDEO GENERATION
========================================= */

app.post(
        "/api/generate-video",
        async(req, res) => {
            try {
                const { recipe } = req.body;

                /* ---------- Validate ---------- */

                if (!recipe) {
                    return res.status(400).json({
                        error: "Recipe data is required.",
                    });
                }

                if (!recipe.name ||
                    !Array.isArray(recipe.steps) ||
                    recipe.steps.length === 0
                ) {
                    return res.status(400).json({
                        error: "A valid recipe with cooking steps is required.",
                    });
                }

                /* =====================================
                   BUILD COOKING SEQUENCE
                ===================================== */

                const cookingSteps = recipe.steps
                    .map((step, index) => {
                        return `${index + 1}. ${step.instruction}`;
                    })
                    .join("\n");

                /* =====================================
                   VIDEO PROMPT
                ===================================== */

                const videoPrompt = `
Create a realistic, clear, instructional cooking
demonstration for the complete recipe "${recipe.name}".

The purpose of this video is accessibility:
a person who has difficulty reading should be able
to understand the main cooking process by watching
the visual actions.

Show the complete cooking sequence as a fast-paced
but easy-to-follow visual montage.

Recipe ingredients:

${recipe.ingredients
    .map((item) => {
        return `${item.quantity} ${item.name}`;
    })
    .join(", ")}

Cooking sequence:

${cookingSteps}

Important visual requirements:

- Show real human hands preparing the food.
- Show important cooking actions clearly.
- Use close-up shots of ingredients and utensils.
- Show actions in the same order as the recipe.
- Use realistic kitchen lighting.
- Keep the cooking surface clean.
- Avoid complicated camera movements.
- Avoid unnecessary people talking to the camera.
- No recipe text or paragraphs on screen.
- Focus on visual demonstration.
- End with the completed dish plated and ready to eat.
- Make the result look appetizing and realistic.
- Use smooth transitions between major cooking actions.
- The video should feel like a short visual cooking tutorial.
`;

            console.log(
                "Starting Veo video generation..."
            );

            console.log(
                `Recipe: ${recipe.name}`
            );

            /* =====================================
               START VIDEO GENERATION
            ===================================== */

            let operation =
                await ai.models.generateVideos({
                    model:
                        "veo-3.1-fast-generate-preview",

                    prompt: videoPrompt,

                    config: {
                        aspectRatio: "16:9",
                        resolution: "720p",
                        numberOfVideos: 1,
                    },
                });

            console.log(
                "Video generation started."
            );

            /* =====================================
               WAIT FOR VIDEO
            ===================================== */

            while (!operation.done) {
                console.log(
                    "Video is still generating..."
                );

                await new Promise((resolve) => {
                    setTimeout(resolve, 10000);
                });

                operation =
                    await ai.operations.getVideosOperation({
                        operation,
                    });
            }

            console.log(
                "Video generation completed."
            );

            /* =====================================
               GET GENERATED VIDEO
            ===================================== */

            const generatedVideos =
                operation.response?.generatedVideos;

            if (
                !generatedVideos ||
                generatedVideos.length === 0
            ) {
                return res.status(500).json({
                    error:
                        "Veo did not return a video.",
                });
            }

            const generatedVideo =
                generatedVideos[0];

            const videoFile =
                generatedVideo.video;

            if (!videoFile) {
                return res.status(500).json({
                    error:
                        "Generated video file was not returned.",
                });
            }

            /* =====================================
               SAVE VIDEO
            ===================================== */

            const safeName =
                recipe.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");

            const fileName =
                `${safeName}-${Date.now()}.mp4`;

            const filePath =
                path.join(
                    videosFolder,
                    fileName
                );

            console.log(
                "Downloading generated video..."
            );

            await ai.files.download({
                file: videoFile,
                downloadPath: filePath,
            });

            console.log(
                `Video saved: ${fileName}`
            );

            /* =====================================
               SEND VIDEO URL
            ===================================== */

            const videoUrl =
                `${
                    process.env.PUBLIC_BASE_URL ||
                    "http://localhost:5000"
                }/generated-videos/${fileName}`;

            return res.json({
                success: true,
                videoUrl,
                message:
                    "Full recipe video generated successfully.",
            });

        } catch (error) {
            console.error(
                "Video generation error:",
                error
            );

            let errorMessage =
                "Unable to generate the recipe video.";

            if (error && error.message) {
                errorMessage = error.message;
            }

            return res.status(500).json({
                error: errorMessage,
            });
        }
    }
);

/* =========================================
   404 HANDLER
========================================= */

app.use((req, res) => {
    return res.status(404).json({
        error: "API endpoint not found.",
        path: req.originalUrl,
    });
});

/* =========================================
   START SERVER
========================================= */

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            "================================="
        );

        console.log(
            "        SMARTPLATE BACKEND"
        );

        console.log(
            "================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "Recipe API: POST /api/recipe"
        );

        console.log(
            "Another Recipe API: POST /api/another-recipe"
        );

        console.log(
            "Video API: POST /api/generate-video"
        );

        console.log(
            "================================="
        );
    }
);