import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

/* =========================================
   PORT
   ========================================= */

const PORT = process.env.PORT || 5000;

/* =========================================
   MIDDLEWARE
   ========================================= */

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

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
        recursive: true
    });
}

/* =========================================
   GEMINI
   ========================================= */

if (!process.env.GEMINI_API_KEY) {
    console.error(
        "ERROR: GEMINI_API_KEY is missing."
    );
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

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
        message: "SmartPlate backend is running!"
    });
});

/* =========================================
   RECIPE GENERATION
   ========================================= */

app.post(
    "/api/recipe",
    async(req, res) => {

        try {

            const {
                ingredients,
                excludeRecipe
            } = req.body;

            /* ---------- Validate ---------- */

            if (!ingredients ||
                typeof ingredients !== "string" ||
                !ingredients.trim()
            ) {
                return res.status(400).json({
                    error: "Ingredients are required."
                });
            }

            /* =====================================
               RECIPE VARIATION
            ===================================== */

            let variationInstruction = "";

            if (excludeRecipe) {

                variationInstruction = `
The user already received this recipe:

"${excludeRecipe}"

IMPORTANT:

Do NOT generate the same recipe again.

Generate a genuinely different dish using the
available ingredients.

Change the preparation method, dish type, or recipe
concept while still keeping the result realistic
and suitable for a normal Indian household.
`;

            }

            /* =====================================
               INDIA-FIRST SMARTPLATE PROMPT
            ===================================== */

            const prompt = `
You are SmartPlate, an AI cooking assistant designed
primarily for Indian households.

Create ONE realistic, practical recipe using the
ingredients provided by the user.

USER INGREDIENTS:
${ingredients}

${variationInstruction}

IMPORTANT RECIPE RULES:

1. Prioritize familiar Indian home-style recipes when
   the ingredients naturally support Indian cooking.

2. The recipe should feel like something a person
   could realistically cook at home in India.

3. Prefer everyday dishes over restaurant-style,
   gourmet, fancy, or unnecessarily complicated food.

4. Use as many of the user's provided ingredients as
   reasonably possible.

5. Do not force ingredients together if the combination
   would taste unnatural.

6. You may use a reasonable number of common Indian
   pantry ingredients.

COMMON INDIAN PANTRY INGREDIENTS MAY INCLUDE:

- Salt
- Red chilli powder
- Green chilli
- Turmeric powder
- Coriander powder
- Cumin seeds
- Mustard seeds
- Garam masala
- Chaat masala
- Black pepper
- Ginger
- Garlic
- Curry leaves
- Fresh coriander
- Asafoetida / hing
- Lemon
- Tamarind
- Ghee
- Cooking oil

7. IMPORTANT:
Do NOT automatically add salt and black pepper
to every recipe.

Choose seasonings according to the actual dish.

For example:

- Poha may use mustard seeds, curry leaves,
  turmeric, green chilli and lemon.

- Aloo curry may use cumin, turmeric, chilli powder
  and coriander powder.

- Chaat-style dishes may use chaat masala,
  cumin and chilli powder.

- Tomato rice may use cumin, chilli, turmeric,
  curry leaves or garam masala depending on the recipe.

- South Indian dishes may use mustard seeds,
  curry leaves, urad dal, chana dal, etc. when
  appropriate.

Only include spices that actually make sense
for the selected recipe.

8. Do not add every pantry ingredient.

Use only the spices and seasonings needed for
the particular dish.

9. Prefer familiar Indian dishes such as:

- Poha
- Upma
- Pulao
- Fried rice
- Tomato rice
- Lemon rice
- Khichdi
- Dal
- Dal rice
- Aloo sabzi
- Vegetable curry
- Stir-fry
- Paratha
- Roti-based dishes
- Chilla
- Dosa-style dishes
- Bread upma
- Masala toast
- Pakora
- Chaat
- Regional home-style dishes

when the user's ingredients naturally support them.

10. Do not invent fancy names for simple dishes.

For example, prefer:

"Aloo Tomato Curry"

instead of:

"Rustic Garden Potato Fusion Bowl".

11. Use realistic Indian quantities.

12. Use realistic cooking times.

13. Keep the recipe beginner-friendly.

14. Avoid expensive or unusual ingredients unless
they are genuinely necessary.

15. If the ingredients clearly belong to another
cuisine, such as pasta with oregano and parmesan,
create an appropriate recipe from that cuisine
instead of unnecessarily Indianizing it.

16. The recipe should be practical, tasty,
affordable, and suitable for a normal home kitchen.

17. If the user has only a few ingredients,
do not create an unnecessarily complicated recipe.

18. Use appropriate Indian cooking techniques such as
tadka, sauteing, boiling, roasting, shallow frying,
pressure cooking, or simmering when applicable.

19. Cooking steps must be clear enough for a beginner
to follow without additional explanation.

20. If generating a variation, make sure the new recipe
is meaningfully different from the previous recipe.

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

            const response =
                await ai.models.generateContent({

                    model: "gemini-3-flash-preview",

                    contents: prompt,

                    config: {
                        responseMimeType: "application/json"
                    }

                });

            const recipeText =
                response.text;

            /* =====================================
               DEBUG RESPONSE
            ===================================== */

            console.log("");
            console.log(
                "=============================="
            );

            console.log(
                "RAW GEMINI RESPONSE:"
            );

            console.log(
                recipeText
            );

            console.log(
                "=============================="
            );

            console.log("");

            if (!recipeText) {

                return res.status(502).json({
                    error: "The AI returned an empty response."
                });

            }

            /* =====================================
               PARSE JSON
            ===================================== */

            let recipe;

            try {

                let cleanedText =
                    recipeText.trim();

                if (
                    cleanedText.startsWith("```")
                ) {

                    cleanedText =
                        cleanedText
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

                recipe =
                    JSON.parse(
                        cleanedText
                    );

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
                    error: "The AI returned recipe data in an unexpected format."
                });

            }

            /* =====================================
               VALIDATE RECIPE
            ===================================== */

            if (!recipe ||
                typeof recipe !== "object"
            ) {

                return res.status(502).json({
                    error: "The AI returned an invalid recipe."
                });

            }

            if (!recipe.name) {

                return res.status(502).json({
                    error: "The AI recipe is missing a name."
                });

            }

            if (!recipe.description) {

                return res.status(502).json({
                    error: "The AI recipe is missing a description."
                });

            }

            if (!Array.isArray(
                    recipe.ingredients
                )) {

                return res.status(502).json({
                    error: "The AI recipe is missing ingredients."
                });

            }

            if (!Array.isArray(
                    recipe.steps
                )) {

                return res.status(502).json({
                    error: "The AI recipe is missing cooking steps."
                });

            }

            if (!Array.isArray(
                    recipe.swaps
                )) {

                recipe.swaps = [];

            }

            /* =====================================
               SUCCESS
            ===================================== */

            console.log(
                "Recipe generated successfully:",
                recipe.name
            );

            res.json(recipe);

        } catch (error) {

            console.error(
                "Gemini recipe error:",
                error
            );

            let errorMessage =
                "Unable to generate recipe right now.";

            if (
                error &&
                error.message
            ) {

                errorMessage =
                    error.message;

            }

            res.status(500).json({
                error: errorMessage
            });

        }

    }
);


/* =========================================
   FULL RECIPE VIDEO GENERATION
========================================= */

app.post(
        "/api/generate-video",
        async(req, res) => {

            try {

                const { recipe } =
                req.body;

                if (!recipe) {

                    return res.status(400).json({
                        error: "Recipe data is required."
                    });

                }

                if (!recipe.name ||
                    !Array.isArray(recipe.steps) ||
                    recipe.steps.length === 0
                ) {

                    return res.status(400).json({
                        error: "A valid recipe with cooking steps is required."
                    });

                }

                /* =====================================
                   BUILD COOKING SEQUENCE
                ===================================== */

                const cookingSteps =
                    recipe.steps
                    .map(
                        (step, index) => {

                            return `${index + 1}. ${step.instruction}`;

                        }
                    )
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
- Show the important cooking actions clearly.
- Use close-up shots of ingredients and utensils.
- Show actions in the same order as the recipe.
- Use realistic kitchen lighting.
- Keep the cooking surface clean and easy to understand.
- Avoid complicated camera movements.
- Avoid unnecessary people talking to the camera.
- No recipe text or paragraphs on screen.
- Focus on visual demonstration rather than written instructions.
- End with the completed dish plated and ready to eat.
- Make the result look appetizing and realistic.
- Use smooth transitions between the major cooking actions.
- The video should feel like a short visual cooking tutorial.
`;

            console.log(
                "Starting Veo video generation..."
            );

            console.log(
                "Recipe:",
                recipe.name
            );


            /* =====================================
               START VIDEO GENERATION
            ===================================== */

            let operation =
                await ai.models.generateVideos({

                    model:
                        "veo-3.1-fast-generate-preview",

                    prompt:
                        videoPrompt,

                    config: {
                        aspectRatio:
                            "16:9",

                        resolution:
                            "720p",

                        numberOfVideos:
                            1
                    }

                });

            console.log(
                "Video generation started."
            );


            /* =====================================
               WAIT FOR VIDEO
            ===================================== */

            while (
                !operation.done
            ) {

                console.log(
                    "Video is still generating..."
                );

                await new Promise(
                    (resolve) => {

                        setTimeout(
                            resolve,
                            10000
                        );

                    }
                );

                operation =
                    await ai.operations.getVideosOperation(
                        {
                            operation:
                                operation
                        }
                    );

            }

            console.log(
                "Video generation completed."
            );


            /* =====================================
               GET GENERATED VIDEO
            ===================================== */

            const generatedVideos =
                operation.response &&
                operation.response.generatedVideos;

            if (
                !generatedVideos ||
                generatedVideos.length === 0
            ) {

                return res.status(500).json({
                    error:
                        "Veo did not return a video."
                });

            }

            const generatedVideo =
                generatedVideos[0];

            const videoFile =
                generatedVideo.video;

            if (!videoFile) {

                return res.status(500).json({
                    error:
                        "Generated video file was not returned."
                });

            }


            /* =====================================
               SAVE VIDEO
            ===================================== */

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

            console.log(
                "Downloading generated video..."
            );

            await ai.files.download({
                file:
                    videoFile,

                downloadPath:
                    filePath
            });

            console.log(
                "Video saved:",
                fileName
            );


            /* =====================================
               SEND VIDEO URL
               RENDER FIX
            ===================================== */

            const videoUrl =
                `${req.protocol}://${req.get("host")}/generated-videos/${fileName}`;

            res.json({

                success:
                    true,

                videoUrl:

                    videoUrl,

                message:
                    "Full recipe video generated successfully."

            });

        } catch (error) {

            console.error(
                "Video generation error:",
                error
            );

            let errorMessage =
                "Unable to generate the recipe video.";

            if (
                error &&
                error.message
            ) {

                errorMessage =
                    error.message;

            }

            res.status(500).json({
                error:
                    errorMessage
            });

        }

    }
);


/* =========================================
   START SERVER
   ========================================= */

app.listen(
    PORT,
    "0.0.0.0",
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

        console.log("");

    }
);