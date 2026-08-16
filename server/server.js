import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = 5000;

/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* =========================================
   CHECK API KEY
========================================= */

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing from .env file");
}

/* =========================================
   GEMINI
========================================= */

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

/*
   Lightweight model for recipe generation.
   This is better suited for simple JSON recipe generation.
*/
const RECIPE_MODEL = "gemini-3.5-flash";

/* =========================================
   PATH SETUP
========================================= */

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const videosFolder = path.join(
    __dirname,
    "generated-videos"
);

if (!fs.existsSync(videosFolder)) {
    fs.mkdirSync(videosFolder, {
        recursive: true,
    });
}

/* =========================================
   SERVE GENERATED VIDEOS
========================================= */

app.use(
    "/generated-videos",
    express.static(videosFolder)
);

/* =========================================
   HOME / HEALTH CHECK
========================================= */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SmartPlate backend is running!",
    });
});

/* =========================================
   RECIPE SCHEMA
========================================= */

const recipeSchema = {
    type: Type.OBJECT,

    properties: {
        name: {
            type: Type.STRING,
        },

        description: {
            type: Type.STRING,
        },

        servings: {
            type: Type.NUMBER,
        },

        timeMinutes: {
            type: Type.NUMBER,
        },

        difficulty: {
            type: Type.STRING,
        },

        ingredients: {
            type: Type.ARRAY,

            items: {
                type: Type.OBJECT,

                properties: {
                    name: {
                        type: Type.STRING,
                    },

                    quantity: {
                        type: Type.STRING,
                    },
                },

                required: [
                    "name",
                    "quantity",
                ],
            },
        },

        steps: {
            type: Type.ARRAY,

            items: {
                type: Type.OBJECT,

                properties: {
                    step: {
                        type: Type.NUMBER,
                    },

                    instruction: {
                        type: Type.STRING,
                    },
                },

                required: [
                    "step",
                    "instruction",
                ],
            },
        },

        swaps: {
            type: Type.ARRAY,

            items: {
                type: Type.OBJECT,

                properties: {
                    ingredient: {
                        type: Type.STRING,
                    },

                    suggestions: {
                        type: Type.ARRAY,

                        items: {
                            type: Type.STRING,
                        },
                    },
                },

                required: [
                    "ingredient",
                    "suggestions",
                ],
            },
        },
    },

    required: [
        "name",
        "description",
        "servings",
        "timeMinutes",
        "difficulty",
        "ingredients",
        "steps",
        "swaps",
    ],
};

/* =========================================
   RECIPE PROMPT
========================================= */

function createRecipePrompt(
    ingredients,
    excludeRecipe = ""
) {
    return `
You are SmartPlate, an AI cooking assistant
designed mainly for Indian households.

The user has these ingredients:

${ingredients}

${
    excludeRecipe
        ? `
The user already received this recipe:

"${excludeRecipe}"

Create a DIFFERENT recipe.
Do not repeat the same dish.
`
        : ""
}

Your job is to create ONE practical,
realistic home-style recipe.

IMPORTANT:

The recipe should feel like something
an Indian family could actually prepare
at home.

Prefer simple everyday Indian cooking.

Examples include:

- Aloo sabzi
- Aloo tomato curry
- Tomato rice
- Lemon rice
- Pulao
- Vegetable rice
- Poha
- Upma
- Chilla
- Egg bhurji
- Egg curry
- Bread upma
- Masala toast
- Pakora
- Chaat
- Dal
- Dal rice
- Khichdi
- Stir fry
- Simple vegetable curry

Only choose a dish that actually matches
the user's ingredients.

Do NOT force unrelated ingredients together.

COMMON INDIAN PANTRY INGREDIENTS MAY BE USED
WHEN THEY ACTUALLY SUIT THE RECIPE:

- Salt
- Cooking oil
- Ghee
- Turmeric powder
- Red chilli powder
- Green chilli
- Coriander powder
- Cumin powder
- Cumin seeds
- Mustard seeds
- Garam masala
- Chaat masala
- Black pepper
- Ginger
- Garlic
- Curry leaves
- Fresh coriander
- Hing
- Lemon
- Tamarind

IMPORTANT:

Do NOT automatically add salt and pepper
to every recipe.

Do NOT automatically add every spice.

Choose only seasonings that make sense
for the specific dish.

For example:

Potato dishes may use:
cumin, turmeric, chilli powder,
coriander powder or garam masala.

South Indian dishes may use:
mustard seeds, curry leaves,
urad dal or chana dal when appropriate.

Chaat may use:
chaat masala, cumin powder,
chilli powder and lemon.

Tomato rice may use:
cumin, chilli, turmeric,
curry leaves or garam masala.

Use realistic quantities.

Use realistic cooking times.

Keep it beginner-friendly.

Use normal Indian household cookware.

Do not create restaurant-style,
gourmet or unnecessarily complicated dishes.

Do not invent fancy names.

For example:

GOOD:
"Aloo Tomato Curry"

BAD:
"Rustic Garden Potato Fusion Bowl"

The recipe must contain:

- 4 to 8 clear cooking steps
- realistic quantities
- realistic preparation
- simple instructions
- useful ingredient swaps

The steps must be easy for a beginner
to understand.

Return ONLY the structured JSON response.
`;
}

/* =========================================
   GENERATE RECIPE
========================================= */

app.post("/api/recipe", async (req, res) => {
    try {
        const {
            ingredients,
            excludeRecipe,
        } = req.body;

        /* ---------- Validate ---------- */

        if (
            !ingredients ||
            typeof ingredients !== "string" ||
            !ingredients.trim()
        ) {
            return res.status(400).json({
                success: false,
                error: "Please enter your ingredients.",
            });
        }

        console.log("");
        console.log("=================================");
        console.log("GENERATING RECIPE");
        console.log("Ingredients:", ingredients);
        console.log("=================================");

        /* ---------- Prompt ---------- */

        const prompt = createRecipePrompt(
            ingredients,
            excludeRecipe || ""
        );

        /* ---------- Gemini ---------- */

        const response =
            await ai.models.generateContent({
                model: RECIPE_MODEL,

                contents: prompt,

                config: {
                    responseMimeType:
                        "application/json",

                    responseSchema:
                        recipeSchema,
                },
            });

        const recipeText = response.text;

        console.log("Gemini response received.");

        if (!recipeText) {
            return res.status(502).json({
                success: false,
                error:
                    "Gemini returned an empty response.",
            });
        }

        /* ---------- Parse ---------- */

        let recipe;

        try {
            recipe = JSON.parse(
                recipeText.trim()
            );
        } catch (parseError) {
            console.error(
                "JSON parse error:",
                parseError
            );

            console.error(
                "Gemini response:",
                recipeText
            );

            return res.status(502).json({
                success: false,
                error:
                    "Gemini returned invalid recipe data.",
            });
        }

        /* ---------- Validate ---------- */

        if (!recipe.name) {
            return res.status(502).json({
                success: false,
                error:
                    "Recipe name is missing.",
            });
        }

        if (
            !Array.isArray(
                recipe.ingredients
            )
        ) {
            return res.status(502).json({
                success: false,
                error:
                    "Recipe ingredients are missing.",
            });
        }

        if (
            !Array.isArray(recipe.steps)
        ) {
            return res.status(502).json({
                success: false,
                error:
                    "Recipe steps are missing.",
            });
        }

        if (
            !Array.isArray(recipe.swaps)
        ) {
            recipe.swaps = [];
        }

        console.log(
            "✅ Recipe generated:",
            recipe.name
        );

        return res.json({
            success: true,
            ...recipe,
        });

    } catch (error) {
        console.error("");
        console.error(
            "================================="
        );
        console.error(
            "❌ GEMINI RECIPE ERROR"
        );
        console.error(
            "================================="
        );
        console.error(error);
        console.error(
            "================================="
        );

        const message =
            error?.message ||
            String(error);

        /* ---------- Quota ---------- */

        if (
            message.includes("429") ||
            message.includes(
                "RESOURCE_EXHAUSTED"
            ) ||
            message
                .toLowerCase()
                .includes("quota")
        ) {
            return res.status(429).json({
                success: false,
                error:
                    "Gemini API quota is exhausted. Please try again later.",
            });
        }

        /* ---------- API Key ---------- */

        if (
            message
                .toLowerCase()
                .includes("api key") ||
            message
                .toLowerCase()
                .includes(
                    "authentication"
                )
        ) {
            return res.status(401).json({
                success: false,
                error:
                    "Gemini API key is invalid or missing. Check your .env file.",
            });
        }

        /* ---------- Other Error ---------- */

        return res.status(500).json({
            success: false,
            error: message,
        });
    }
});

/* =========================================
   ANOTHER RECIPE
========================================= */

app.post(
    "/api/another-recipe",
    async (req, res) => {
        try {
            const {
                ingredients,
                previousRecipe,
            } = req.body;

            if (
                !ingredients ||
                typeof ingredients !==
                    "string" ||
                !ingredients.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Ingredients are required.",
                });
            }

            console.log(
                "Generating another recipe..."
            );

            const prompt =
                createRecipePrompt(
                    ingredients,
                    previousRecipe || ""
                );

            const response =
                await ai.models.generateContent({
                    model: RECIPE_MODEL,

                    contents: prompt,

                    config: {
                        responseMimeType:
                            "application/json",

                        responseSchema:
                            recipeSchema,
                    },
                });

            const recipeText =
                response.text;

            if (!recipeText) {
                return res.status(502).json({
                    success: false,
                    error:
                        "Gemini returned an empty response.",
                });
            }

            let recipe;

            try {
                recipe = JSON.parse(
                    recipeText.trim()
                );
            } catch (error) {
                console.error(
                    "Another recipe JSON error:",
                    error
                );

                return res.status(502).json({
                    success: false,
                    error:
                        "Gemini returned invalid recipe data.",
                });
            }

            if (
                !recipe.name ||
                !Array.isArray(
                    recipe.ingredients
                ) ||
                !Array.isArray(
                    recipe.steps
                )
            ) {
                return res.status(502).json({
                    success: false,
                    error:
                        "Gemini returned an incomplete recipe.",
                });
            }

            if (
                !Array.isArray(
                    recipe.swaps
                )
            ) {
                recipe.swaps = [];
            }

            console.log(
                "✅ Another recipe:",
                recipe.name
            );

            return res.json({
                success: true,
                ...recipe,
            });

        } catch (error) {
            console.error(
                "Another recipe error:",
                error
            );

            const message =
                error?.message ||
                String(error);

            return res.status(500).json({
                success: false,
                error: message,
            });
        }
    }
);

/* =========================================
   FULL RECIPE VIDEO
========================================= */

app.post(
    "/api/generate-video",
    async (req, res) => {
        try {
            const { recipe } = req.body;

            if (!recipe) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Recipe data is required.",
                });
            }

            if (
                !recipe.name ||
                !Array.isArray(
                    recipe.steps
                ) ||
                recipe.steps.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "A valid recipe with steps is required.",
                });
            }

            const cookingSteps =
                recipe.steps
                    .map(
                        (step, index) =>
                            `${index + 1}. ${step.instruction}`
                    )
                    .join("\n");

            const videoPrompt = `
Create a realistic instructional
cooking video for:

${recipe.name}

Show the COMPLETE recipe from
preparation to final plating.

Ingredients:

${recipe.ingredients
    .map(
        (item) =>
            `${item.quantity} ${item.name}`
    )
    .join(", ")}

Cooking steps:

${cookingSteps}

IMPORTANT:

- Show real human hands.
- Show ingredients clearly.
- Show chopping and preparation.
- Show cooking actions clearly.
- Follow the steps in order.
- Use an Indian home kitchen.
- Make the cooking visually understandable.
- No long text on screen.
- No talking-head presentation.
- Focus on actual cooking actions.
- End with the completed dish.
- Make the food look realistic and appetizing.
`;

            console.log(
                "Starting video generation..."
            );

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

            while (!operation.done) {
                console.log(
                    "Video still generating..."
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            10000
                        )
                );

                operation =
                    await ai.operations
                        .getVideosOperation({
                            operation,
                        });
            }

            const generatedVideos =
                operation.response
                    ?.generatedVideos;

            if (
                !generatedVideos ||
                generatedVideos.length === 0
            ) {
                return res.status(500).json({
                    success: false,
                    error:
                        "Veo did not return a video.",
                });
            }

            const videoFile =
                generatedVideos[0]?.video;

            if (!videoFile) {
                return res.status(500).json({
                    success: false,
                    error:
                        "Generated video file was not returned.",
                });
            }

            const safeName =
                recipe.name
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]+/g,
                        "-"
                    )
                    .replace(
                        /^-|-$/g,
                        ""
                    );

            const fileName =
                `${safeName}-${Date.now()}.mp4`;

            const filePath =
                path.join(
                    videosFolder,
                    fileName
                );

            await ai.files.download({
                file: videoFile,
                downloadPath:
                    filePath,
            });

            const videoUrl =
                `http://localhost:${PORT}/generated-videos/${fileName}`;

            console.log(
                "✅ Video saved:",
                fileName
            );

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

            const message =
                error?.message ||
                String(error);

            return res.status(500).json({
                success: false,
                error: message,
            });
        }
    }
);

/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,
    "localhost",
    () => {
        console.log("");
        console.log(
            "================================="
        );
        console.log(
            "       SMARTPLATE BACKEND"
        );
        console.log(
            "================================="
        );
        console.log(
            `Server running on http://localhost:${PORT}`
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
        console.log("");
    }
);