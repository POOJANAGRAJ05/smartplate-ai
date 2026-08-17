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

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const videosFolder = path.join(__dirname, "generated-videos");

if (!fs.existsSync(videosFolder)) {
    fs.mkdirSync(videosFolder, { recursive: true });
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from .env");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

app.use(
    "/generated-videos",
    express.static(videosFolder)
);


/* =========================================================
   HOME
========================================================= */

app.get("/", function(req, res) {
    res.json({
        success: true,
        message: "SmartPlate backend is running!"
    });
});


/* =========================================================
   FALLBACK RECIPES
========================================================= */

function getFallbackRecipe(ingredients, excludeRecipe) {

    const text = String(ingredients || "").toLowerCase();

    const excluded = String(excludeRecipe || "").toLowerCase();

    const recipes = [

        {
            name: "Aloo Pyaz Rice",

            description: "A simple Indian home-style rice dish made with potato and onion.",

            servings: 2,

            timeMinutes: 25,

            difficulty: "Easy",

            ingredients: [{
                    name: "Cooked rice",
                    quantity: "2 cups"
                },
                {
                    name: "Potato",
                    quantity: "1 medium, diced"
                },
                {
                    name: "Onion",
                    quantity: "1 medium, sliced"
                },
                {
                    name: "Cooking oil",
                    quantity: "1 tablespoon"
                },
                {
                    name: "Cumin seeds",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Turmeric powder",
                    quantity: "1/4 teaspoon"
                },
                {
                    name: "Red chilli powder",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Salt",
                    quantity: "to taste"
                }
            ],

            steps: [{
                    step: 1,
                    instruction: "Heat oil in a pan and add cumin seeds."
                },
                {
                    step: 2,
                    instruction: "Add onion and saute until lightly golden."
                },
                {
                    step: 3,
                    instruction: "Add potato, turmeric and salt. Cover and cook until tender."
                },
                {
                    step: 4,
                    instruction: "Add red chilli powder and mix well."
                },
                {
                    step: 5,
                    instruction: "Add cooked rice and gently mix everything together."
                },
                {
                    step: 6,
                    instruction: "Cook for 2 to 3 minutes and serve hot."
                }
            ],

            swaps: [{
                    ingredient: "Cooking oil",
                    suggestions: [
                        "Ghee",
                        "Butter"
                    ]
                },
                {
                    ingredient: "Cumin seeds",
                    suggestions: [
                        "Mustard seeds",
                        "Curry leaves"
                    ]
                }
            ]
        },


        {
            name: "Aloo Pyaz ki Sabzi",

            description: "A comforting everyday Indian dry sabzi made with potatoes and onions.",

            servings: 2,

            timeMinutes: 25,

            difficulty: "Easy",

            ingredients: [{
                    name: "Potato",
                    quantity: "3 medium, cubed"
                },
                {
                    name: "Onion",
                    quantity: "2 medium, sliced"
                },
                {
                    name: "Cooking oil",
                    quantity: "2 tablespoons"
                },
                {
                    name: "Cumin seeds",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Turmeric powder",
                    quantity: "1/4 teaspoon"
                },
                {
                    name: "Red chilli powder",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Salt",
                    quantity: "to taste"
                }
            ],

            steps: [{
                    step: 1,
                    instruction: "Heat oil in a kadai and add cumin seeds."
                },
                {
                    step: 2,
                    instruction: "Add onions and saute for 2 to 3 minutes."
                },
                {
                    step: 3,
                    instruction: "Add potato, turmeric and salt. Mix well."
                },
                {
                    step: 4,
                    instruction: "Cover and cook until the potatoes are tender."
                },
                {
                    step: 5,
                    instruction: "Add red chilli powder and cook uncovered for 3 minutes."
                },
                {
                    step: 6,
                    instruction: "Serve hot with roti, chapati or rice."
                }
            ],

            swaps: [{
                    ingredient: "Cooking oil",
                    suggestions: [
                        "Ghee",
                        "Mustard oil"
                    ]
                },
                {
                    ingredient: "Cumin seeds",
                    suggestions: [
                        "Mustard seeds",
                        "Nigella seeds"
                    ]
                }
            ]
        },


        {
            name: "Vegetable Masala Rice",

            description: "A quick and flavorful Indian rice dish using vegetables and simple spices.",

            servings: 2,

            timeMinutes: 20,

            difficulty: "Easy",

            ingredients: [{
                    name: "Cooked rice",
                    quantity: "2 cups"
                },
                {
                    name: "Onion",
                    quantity: "1 medium, chopped"
                },
                {
                    name: "Mixed vegetables",
                    quantity: "1 cup, chopped"
                },
                {
                    name: "Cooking oil",
                    quantity: "1 tablespoon"
                },
                {
                    name: "Cumin seeds",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Garam masala",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Salt",
                    quantity: "to taste"
                }
            ],

            steps: [{
                    step: 1,
                    instruction: "Heat oil and add cumin seeds."
                },
                {
                    step: 2,
                    instruction: "Add onion and saute until translucent."
                },
                {
                    step: 3,
                    instruction: "Add vegetables and salt. Cook until tender."
                },
                {
                    step: 4,
                    instruction: "Add garam masala and mix well."
                },
                {
                    step: 5,
                    instruction: "Add cooked rice and gently combine."
                },
                {
                    step: 6,
                    instruction: "Cook for 2 minutes and serve hot."
                }
            ],

            swaps: [{
                    ingredient: "Garam masala",
                    suggestions: [
                        "Curry powder",
                        "Black pepper"
                    ]
                },
                {
                    ingredient: "Cooking oil",
                    suggestions: [
                        "Ghee",
                        "Butter"
                    ]
                }
            ]
        },


        {
            name: "Onion Tomato Poha",

            description: "A quick Indian breakfast made with poha, onion and tomato.",

            servings: 2,

            timeMinutes: 15,

            difficulty: "Easy",

            ingredients: [{
                    name: "Poha",
                    quantity: "2 cups"
                },
                {
                    name: "Onion",
                    quantity: "1 medium, chopped"
                },
                {
                    name: "Tomato",
                    quantity: "1 medium, chopped"
                },
                {
                    name: "Cooking oil",
                    quantity: "1 tablespoon"
                },
                {
                    name: "Mustard seeds",
                    quantity: "1/2 teaspoon"
                },
                {
                    name: "Turmeric powder",
                    quantity: "1/4 teaspoon"
                },
                {
                    name: "Salt",
                    quantity: "to taste"
                }
            ],

            steps: [{
                    step: 1,
                    instruction: "Rinse the poha gently and drain it."
                },
                {
                    step: 2,
                    instruction: "Heat oil and add mustard seeds."
                },
                {
                    step: 3,
                    instruction: "Add onion and saute until soft."
                },
                {
                    step: 4,
                    instruction: "Add tomato, turmeric and salt. Cook for 2 minutes."
                },
                {
                    step: 5,
                    instruction: "Add poha and gently mix everything together."
                },
                {
                    step: 6,
                    instruction: "Cook for 2 to 3 minutes and serve hot."
                }
            ],

            swaps: [{
                    ingredient: "Poha",
                    suggestions: [
                        "Broken wheat",
                        "Cooked rice"
                    ]
                },
                {
                    ingredient: "Mustard seeds",
                    suggestions: [
                        "Cumin seeds",
                        "Nigella seeds"
                    ]
                }
            ]
        }
    ];


    let selectedRecipe = recipes[2];


    if (text.includes("poha")) {

        selectedRecipe = recipes[3];

    } else if (
        text.includes("rice") &&
        (
            text.includes("onion") ||
            text.includes("potato")
        )
    ) {

        selectedRecipe = recipes[0];

    } else if (
        text.includes("potato") &&
        text.includes("onion")
    ) {

        selectedRecipe = recipes[1];

    } else if (text.includes("rice")) {

        selectedRecipe = recipes[2];
    }


    if (
        excluded &&
        selectedRecipe.name.toLowerCase() === excluded
    ) {

        for (let i = 0; i < recipes.length; i++) {

            if (
                recipes[i].name.toLowerCase() !== excluded
            ) {

                selectedRecipe = recipes[i];

                break;
            }
        }
    }


    return selectedRecipe;
}


/* =========================================================
   QUOTA ERROR CHECK
========================================================= */

function isQuotaError(error) {

    let message = "";

    if (error && error.message) {
        message = String(error.message);
    } else if (error) {
        message = String(error);
    }

    message = message.toLowerCase();

    return (
        message.includes("429") ||
        message.includes("resource_exhausted") ||
        message.includes("quota") ||
        message.includes("rate limit") ||
        message.includes("exceeded your current quota") ||
        message.includes("503") ||
        message.includes("unavailable") ||
        (error && error.status === 503) ||
        (error && error.code === 503)
    );
}


/* =========================================================
   GENERATE RECIPE
========================================================= */

async function generateRecipe(req, res) {

    const ingredients =
        req.body && req.body.ingredients ?
        req.body.ingredients :
        "";

    const excludeRecipe =
        req.body && req.body.excludeRecipe ?
        req.body.excludeRecipe :
        "";


    if (!ingredients ||
        typeof ingredients !== "string" ||
        !ingredients.trim()
    ) {

        return res.status(400).json({
            error: "Ingredients are required."
        });
    }


    try {

        const prompt = `
You are SmartPlate, an AI cooking assistant for Indian households.

Create ONE realistic and practical recipe using these ingredients:

${ingredients}

${
    excludeRecipe
        ? `
The user already received this recipe:

"${excludeRecipe}"

Generate a DIFFERENT recipe.
Do not return the same dish with another name.
`
        : ""
}

Prefer familiar Indian home-style recipes.

Use realistic quantities.

Keep the recipe simple and beginner-friendly.

Return ONLY valid JSON.

Use exactly this structure:

{
    "name": "Recipe name",
    "description": "Short description",
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

Do not use markdown.
Do not use code fences.
Do not add text outside JSON.
`;


        console.log("Generating recipe...");


        const response =
            await ai.models.generateContent({

                model: "gemini-3.1-flash-lite",

                contents: prompt,

                config: {
                    responseMimeType: "application/json"
                }
            });


        let recipeText = "";

        if (response && response.text) {

            recipeText = String(
                response.text
            ).trim();
        }


        if (
            recipeText.startsWith("```")
        ) {

            recipeText =
                recipeText
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();
        }


        if (!recipeText) {

            throw new Error(
                "Gemini returned an empty response."
            );
        }


        const recipe =
            JSON.parse(recipeText);


        if (
            !recipe ||
            !recipe.name ||
            !Array.isArray(recipe.ingredients) ||
            !Array.isArray(recipe.steps)
        ) {

            throw new Error(
                "Invalid recipe returned by Gemini."
            );
        }


        if (!Array.isArray(recipe.swaps)) {

            recipe.swaps = [];
        }


        console.log(
            "Recipe generated successfully: " +
            recipe.name
        );


        return res.json(recipe);


    } catch (error) {

        let errorMessage = "Unknown error";

        if (error && error.message) {

            errorMessage = error.message;
        }


        console.error(
            "Recipe generation error:",
            errorMessage
        );


        if (isQuotaError(error)) {

            const fallbackRecipe =
                getFallbackRecipe(
                    ingredients,
                    excludeRecipe
                );


            console.log(
                "Gemini quota unavailable."
            );

            console.log(
                "Using fallback recipe: " +
                fallbackRecipe.name
            );


            return res.json(
                fallbackRecipe
            );
        }


        return res.status(500).json({

            error:
                "Unable to generate recipe right now."

        });
    }
}


/* =========================================================
   RECIPE APIs
========================================================= */

app.post(
    "/api/recipe",
    generateRecipe
);


app.post(
    "/api/another-recipe",
    generateRecipe
);


/* =========================================================
   VIDEO API
========================================================= */

app.post(
    "/api/generate-video",
    async function (req, res) {

        try {

            const recipe =
                req.body && req.body.recipe
                    ? req.body.recipe
                    : null;


            if (!recipe) {

                return res.status(400).json({
                    error:
                        "Recipe data is required."
                });
            }


            if (
                !recipe.name ||
                !Array.isArray(recipe.steps) ||
                recipe.steps.length === 0
            ) {

                return res.status(400).json({
                    error:
                        "A valid recipe with cooking steps is required."
                });
            }


            const cookingSteps =
                recipe.steps
                    .map(
                        function (step, index) {

                            return (
                                (index + 1) +
                                ". " +
                                step.instruction
                            );
                        }
                    )
                    .join("\n");


            let ingredientsList = "";


            if (
                Array.isArray(
                    recipe.ingredients
                )
            ) {

                ingredientsList =
                    recipe.ingredients
                        .map(
                            function (item) {

                                return (
                                    item.quantity +
                                    " " +
                                    item.name
                                );
                            }
                        )
                        .join(", ");
            }


            const videoPrompt = `
Create a realistic instructional cooking demonstration
for the recipe "${recipe.name}".

Ingredients:

${ingredientsList}

Cooking sequence:

${cookingSteps}

Requirements:

- Show real human hands.
- Show ingredients clearly.
- Show important cooking actions.
- Follow the recipe order.
- Use realistic kitchen lighting.
- Use close-up cooking shots.
- Avoid unnecessary talking.
- End with the completed dish.
- Make the result realistic and appetizing.
`;


            console.log(
                "Starting video generation..."
            );


            let operation =
                await ai.models.generateVideos({

                    model:
                        "veo-3.1-fast-generate-preview",

                    prompt:
                        videoPrompt,

                    config: {

                        aspectRatio: "16:9",

                        resolution: "720p",

                        numberOfVideos: 1
                    }
                });


            while (!operation.done) {

                console.log(
                    "Video is still generating..."
                );


                await new Promise(
                    function (resolve) {

                        setTimeout(
                            resolve,
                            10000
                        );
                    }
                );


                operation =
                    await ai.operations.getVideosOperation(
                        {
                            operation: operation
                        }
                    );
            }


            const generatedVideos =
                operation.response &&
                operation.response.generatedVideos
                    ? operation.response.generatedVideos
                    : [];


            if (
                generatedVideos.length === 0
            ) {

                return res.status(500).json({
                    error:
                        "Veo did not return a video."
                });
            }


            const videoFile =
                generatedVideos[0] &&
                generatedVideos[0].video
                    ? generatedVideos[0].video
                    : null;


            if (!videoFile) {

                return res.status(500).json({
                    error:
                        "Generated video file was not returned."
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
                        "");


            const fileName =
                safeName +
                "-" +
                Date.now() +
                ".mp4";


            const filePath =
                path.join(
                    videosFolder,
                    fileName
                );


            await ai.files.download({

                file: videoFile,

                downloadPath: filePath
            });


            const baseUrl =
                process.env.PUBLIC_BASE_URL ||
                "http://localhost:5000";


            return res.json({

                success: true,

                videoUrl:
                    baseUrl +
                    "/generated-videos/" +
                    fileName,

                message:
                    "Recipe video generated successfully."
            });


        } catch (error) {

            let errorMessage = "Unknown error";

            if (
                error &&
                error.message
            ) {

                errorMessage =
                    error.message;
            }


            console.error(
                "Video generation error:",
                errorMessage
            );


            if (isQuotaError(error)) {

                return res.status(503).json({

                    error:
                        "AI video generation is temporarily unavailable because the video API quota is exhausted. Your recipe is still available."

                });
            }


            return res.status(500).json({

                error:
                    "Unable to generate the recipe video."

            });
        }
    }
);


/* =========================================================
   404
========================================================= */

app.use(
    function (req, res) {

        return res.status(404).json({

            error:
                "API endpoint not found.",

            path:
                req.originalUrl
        });
    }
);


/* =========================================================
   START SERVER
========================================================= */

const PORT =
    process.env.PORT || 5000;


app.listen(
    PORT,
    "0.0.0.0",
    function () {

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
            "Server running on port " + PORT
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