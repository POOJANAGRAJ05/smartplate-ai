import { useEffect, useMemo, useState } from "react";
import "./App.css";

/* =========================================================
   API
========================================================= */

const API_BASE = "https://smartplate-ai-yfd5.onrender.com";


/* =========================================================
   INDIAN FOOD IMAGES
========================================================= */

const FOOD_IMAGES = {
  rice:
    "https://images.unsplash.com/photo-1517244683847-7456b63c5969?auto=format&fit=crop&w=1200&q=85",

  dosa:
    "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1200&q=85",

  paneer:
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85",

  curry:
    "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1200&q=85",

  indian:
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=85",
};


/* =========================================================
   FIND FOOD IMAGE
========================================================= */

function getFoodImage(recipe) {

  const text = `
    ${recipe?.name || ""}
    ${recipe?.description || ""}
    ${(recipe?.ingredients || [])
      .map((item) => item.name)
      .join(" ")}
  `.toLowerCase();


  if (
    text.includes("dosa") ||
    text.includes("dosai") ||
    text.includes("chilla") ||
    text.includes("uttapam")
  ) {
    return FOOD_IMAGES.dosa;
  }


  if (
    text.includes("paneer") ||
    text.includes("palak") ||
    text.includes("matar paneer")
  ) {
    return FOOD_IMAGES.paneer;
  }


  if (
    text.includes("rice") ||
    text.includes("pulao") ||
    text.includes("pulav") ||
    text.includes("biryani") ||
    text.includes("fried rice")
  ) {
    return FOOD_IMAGES.rice;
  }


  if (
    text.includes("curry") ||
    text.includes("masala") ||
    text.includes("dal") ||
    text.includes("sambar")
  ) {
    return FOOD_IMAGES.curry;
  }


  return FOOD_IMAGES.indian;
}


/* =========================================================
   SCALE INGREDIENT QUANTITY
========================================================= */

function scaleQuantity(
  quantity,
  originalServings,
  currentServings
) {

  if (!quantity) {
    return quantity;
  }


  if (
    !originalServings ||
    !currentServings
  ) {
    return quantity;
  }


  const ratio =
    currentServings /
    originalServings;


  /*
    Find the first number in the quantity.

    Examples:

    "2"
    "2 medium"
    "1/2 cup"
    "1.5 cups"
    "2-3 tbsp"
  */

  const match =
    String(quantity).match(
      /^\s*(\d+(?:\.\d+)?|\d+\s*\/\s*\d+)(.*)$/i
    );


  if (!match) {
    return quantity;
  }


  let numberText =
    match[1].trim();


  let value;


  /*
    Handle fractions such as 1/2
  */

  if (
    numberText.includes("/")
  ) {

    const parts =
      numberText
        .split("/")
        .map((part) =>
          Number(part.trim())
        );


    if (
      parts.length === 2 &&
      parts[1] !== 0
    ) {

      value =
        parts[0] /
        parts[1];

    } else {

      return quantity;

    }

  } else {

    value =
      Number(numberText);

  }


  if (
    Number.isNaN(value)
  ) {
    return quantity;
  }


  const scaled =
    value * ratio;


  /*
    Keep sensible decimal values.
  */

  let rounded;


  if (
    scaled >= 10
  ) {

    rounded =
      Math.round(scaled);

  } else {

    rounded =
      Math.round(
        scaled * 10
      ) / 10;

  }


  /*
    Convert some common decimals
    back into friendly fractions.
  */

  let displayValue;


  if (
    Math.abs(
      rounded - 0.25
    ) < 0.01
  ) {

    displayValue = "1/4";

  } else if (
    Math.abs(
      rounded - 0.5
    ) < 0.01
  ) {

    displayValue = "1/2";

  } else if (
    Math.abs(
      rounded - 0.75
    ) < 0.01
  ) {

    displayValue = "3/4";

  } else if (
    Math.abs(
      rounded - 1.25
    ) < 0.01
  ) {

    displayValue = "1 1/4";

  } else if (
    Math.abs(
      rounded - 1.5
    ) < 0.01
  ) {

    displayValue = "1 1/2";

  } else if (
    Math.abs(
      rounded - 1.75
    ) < 0.01
  ) {

    displayValue = "1 3/4";

  } else {

    displayValue =
      String(rounded);

  }


  return `${displayValue}${match[2]}`;
}


/* =========================================================
   HOME PAGE
========================================================= */

function HomePage({
  onRecipeGenerated
}) {

  const [ingredients, setIngredients] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [listening, setListening] =
    useState(false);

  const [savedRecipes, setSavedRecipes] =
    useState([]);


  const quickIngredients = [
    ["🥚", "Eggs"],
    ["🍅", "Tomato"],
    ["🥔", "Potato"],
    ["🧅", "Onion"],
    ["🍚", "Rice"],
  ];


  /* =======================================================
     LOAD ALL SAVED RECIPES
  ======================================================= */

  const loadSavedRecipes = () => {
    try {
      const stored =
        localStorage.getItem(
          "smartplate-saved-recipes"
        );

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setSavedRecipes(parsed);
          return;
        }
      }

      // Migrate the old single-recipe storage format, if present.
      const oldStored =
        localStorage.getItem(
          "smartplate-saved-recipe"
        );

      if (oldStored) {
        const oldRecipe = JSON.parse(oldStored);

        if (oldRecipe?.name) {
          const migrated = [oldRecipe];

          localStorage.setItem(
            "smartplate-saved-recipes",
            JSON.stringify(migrated)
          );

          localStorage.removeItem(
            "smartplate-saved-recipe"
          );

          setSavedRecipes(migrated);
          return;
        }
      }

      setSavedRecipes([]);
    } catch (error) {
      console.error(
        "Unable to load saved recipes:",
        error
      );
      setSavedRecipes([]);
    }
  };

  useEffect(() => {
    loadSavedRecipes();

    const handleSavedRecipesChanged = () => {
      loadSavedRecipes();
    };

    window.addEventListener(
      "smartplate-recipe-saved",
      handleSavedRecipesChanged
    );

    return () => {
      window.removeEventListener(
        "smartplate-recipe-saved",
        handleSavedRecipesChanged
      );
    };
  }, []);


  /* =======================================================
     VOICE INPUT
  ======================================================= */

  const startVoiceInput = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

      setError(
        "Voice input is not supported in this browser. Please use Chrome."
      );

      return;

    }


    const recognition =
      new SpeechRecognition();


    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;


    setListening(true);
    setError("");


    recognition.onresult =
      (event) => {

        const spokenText =
          event.results[0][0]
            .transcript;


        setIngredients(
          (previous) => {

            if (!previous.trim()) {

              return spokenText;

            }


            return `${previous}, ${spokenText}`;

          }
        );


        setListening(false);

      };


    recognition.onerror = () => {

      setListening(false);

      setError(
        "Could not hear you. Please try again."
      );

    };


    recognition.onend = () => {

      setListening(false);

    };


    recognition.start();

  };


  /* =======================================================
     QUICK ADD
  ======================================================= */

  const addIngredient = (
    ingredient
  ) => {

    setIngredients(
      (previous) => {

        if (!previous.trim()) {

          return ingredient;

        }


        return `${previous}, ${ingredient}`;

      }
    );

  };


  /* =======================================================
     GENERATE RECIPE
  ======================================================= */

  const generateRecipe =
    async () => {

      if (!ingredients.trim()) {

        setError(
          "Please enter at least one ingredient."
        );

        return;

      }


      setLoading(true);
      setError("");


      try {

        const response =
          await fetch(
            `${API_BASE}/api/recipe`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                ingredients,
              }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data?.error ||
              "Unable to generate recipe."
          );

        }


        onRecipeGenerated(data);


      } catch (error) {

        console.error(
          "Recipe generation error:",
          error
        );


        setError(
          error?.message ||
            "Unable to generate recipe right now."
        );


      } finally {

        setLoading(false);

      }

    };


  /* =======================================================
     OPEN SAVED RECIPE
  ======================================================= */

  const openSavedRecipe =
    (selectedRecipe) => {

      if (!selectedRecipe) {
        return;
      }

      onRecipeGenerated(
        selectedRecipe
      );
    };


  /* =======================================================
     DELETE SAVED RECIPE
  ======================================================= */

  const deleteSavedRecipe =
    (recipeName) => {

      try {
        const updatedRecipes =
          savedRecipes.filter(
            (item) =>
              item?.name !== recipeName
          );

        localStorage.setItem(
          "smartplate-saved-recipes",
          JSON.stringify(updatedRecipes)
        );

        setSavedRecipes(updatedRecipes);
      } catch (error) {
        console.error(
          "Delete saved recipe error:",
          error
        );
      }
    };


  return (
    <>

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="site-header">

        <div className="container nav-inner">

          <div className="brand">

            <div className="brand-mark">
              🍽️
            </div>

            SmartPlate <b>AI</b>

          </div>


          <div className="nav-right">

            <span className="nav-status">
              🇮🇳 Indian home-style recipes
            </span>


            {savedRecipes.length > 0 && (

              <a
                href="#saved-recipes"
                style={{
                  border:
                    "1px solid #dce3de",
                  background:
                    "white",
                  borderRadius:
                    "10px",
                  padding:
                    "9px 13px",
                  color:
                    "#244d3b",
                  fontWeight:
                    600,
                  fontSize:
                    "12px",
                  textDecoration:
                    "none",
                }}
              >
                ♥ Saved Recipes ({savedRecipes.length})
              </a>

            )}


            <a href="#how-it-works">
              How it works
            </a>

          </div>

        </div>

      </header>


      <main>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="home-hero">

          <div className="container hero-grid">

            <div className="hero-copy">

              <span className="eyebrow">
                ✦ AI-POWERED INDIAN COOKING
              </span>


              <h1>
                Make a meal

                <span>
                  from what you
                </span>

                have.
              </h1>


              <p className="hero-text">
                Tell SmartPlate what's in your
                kitchen and get a practical
                Indian home-style recipe in
                seconds.
              </p>


              <div className="input-card">

                <div className="input-card-heading">

                  <div>

                    <h2>
                      What's in your kitchen?
                    </h2>


                    <p>
                      Type them or simply tell us.
                    </p>

                  </div>


                  <span className="input-emoji">
                    🥕
                  </span>

                </div>


                <div className="ingredient-input-wrap">

                  <textarea
                    value={ingredients}
                    onChange={(event) => {

                      setIngredients(
                        event.target.value
                      );

                      setError("");

                    }}
                    placeholder="Example: potato, onion, tomato, rice"
                  />


                  <button
                    className={`voice-button ${
                      listening
                        ? "recording"
                        : ""
                    }`}
                    onClick={
                      startVoiceInput
                    }
                    type="button"
                  >
                    🎙️{" "}

                    {listening
                      ? "Listening..."
                      : "Speak"}

                  </button>

                </div>


                {listening && (

                  <div className="voice-hint">
                    🎙️ Listening... Tell me
                    what's available in your
                    kitchen.
                  </div>

                )}


                <div className="quick-row">

                  <span>
                    Quick add
                  </span>


                  {quickIngredients.map(
                    ([emoji, name]) => (

                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          addIngredient(name)
                        }
                      >
                        {emoji} {name}
                      </button>

                    )
                  )}

                </div>


                {error && (

                  <div className="error-message">
                    ⚠️ {error}
                  </div>

                )}


                <button
                  className="generate-button"
                  onClick={
                    generateRecipe
                  }
                  disabled={loading}
                  type="button"
                >

                  <span>
                    {loading
                      ? "Creating your recipe..."
                      : "Generate My Recipe"}
                  </span>


                  <span>
                    {loading
                      ? "⏳"
                      : "→"}
                  </span>

                </button>

              </div>


              {/* SAVED RECIPES */}

              {savedRecipes.length > 0 && (

                <div
                  id="saved-recipes"
                  style={{
                    marginTop:
                      "18px",
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap:
                      "10px",
                  }}
                >

                  <div
                    style={{
                      color:
                        "#244d3b",
                      fontWeight:
                        700,
                      fontSize:
                        "15px",
                      marginBottom:
                        "2px",
                    }}
                  >
                    ♥ Saved Recipes
                  </div>

                  {savedRecipes.map(
                    (savedItem, index) => (

                      <div
                        key={`${savedItem?.name || "recipe"}-${index}`}
                        style={{
                          padding:
                            "14px 16px",
                          border:
                            "1px solid #dce3de",
                          borderRadius:
                            "14px",
                          background:
                            "#f1f6f1",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap:
                            "15px",
                        }}
                      >

                        <div
                          style={{
                            minWidth:
                              0,
                          }}
                        >
                          <strong
                            style={{
                              display:
                                "block",
                              color:
                                "#244d3b",
                              fontSize:
                                "13px",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {savedItem?.name ||
                              "Saved Recipe"}
                          </strong>

                          <span
                            style={{
                              display:
                                "block",
                              marginTop:
                                "4px",
                              color:
                                "#6c7f77",
                              fontSize:
                                "11px",
                            }}
                          >
                            Recipe {index + 1}
                          </span>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "7px",
                            flexShrink:
                              0,
                          }}
                        >

                          <button
                            type="button"
                            onClick={() =>
                              openSavedRecipe(
                                savedItem
                              )
                            }
                            style={{
                              padding:
                                "8px 12px",
                              border:
                                "none",
                              borderRadius:
                                "9px",
                              background:
                                "#244d3b",
                              color:
                                "white",
                              fontSize:
                                "11px",
                              fontWeight:
                                700,
                              cursor:
                                "pointer",
                            }}
                          >
                            Open
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSavedRecipe(
                                savedItem?.name
                              )
                            }
                            style={{
                              padding:
                                "8px 11px",
                              border:
                                "1px solid #dce3de",
                              borderRadius:
                                "9px",
                              background:
                                "white",
                              color:
                                "#b74c3d",
                              fontSize:
                                "11px",
                              fontWeight:
                                700,
                              cursor:
                                "pointer",
                            }}
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}


              <div className="hero-features">

                <div>
                  <span>✓</span>
                  Indian home-style
                </div>


                <div>
                  <span>✓</span>
                  Voice-friendly
                </div>


                <div>
                  <span>✓</span>
                  Less food waste
                </div>

              </div>

            </div>


            {/* HERO IMAGE */}

            <div className="hero-art">

              <div className="art-glow" />


              <div className="art-floating floating-one">

                <span>
                  🎙️
                </span>


                <div>

                  <strong>
                    Just speak
                  </strong>


                  <small>
                    No typing needed
                  </small>

                </div>

              </div>


              <div className="main-dish-card">

                <img
                  className="hero-food-image"
                  src={
                    FOOD_IMAGES.indian
                  }
                  alt="Indian home cooked food"
                />


                <span className="art-label">
                  SMARTPLATE PICK
                </span>


                <h3>
                  Everyday Indian comfort food
                </h3>


                <p>
                  Simple ingredients.
                  Delicious possibilities.
                </p>


                <div className="art-tags">

                  <span>
                    🇮🇳 Home-style
                  </span>


                  <span>
                    ♻️ Less waste
                  </span>

                </div>

              </div>


              <div className="art-floating floating-two">

                <span>
                  ✨
                </span>


                <div>

                  <strong>
                    Indian recipes
                  </strong>


                  <small>
                    Made for everyday kitchens
                  </small>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section
          className="how-section"
          id="how-it-works"
        >

          <div className="container">

            <div className="section-title">

              <span>
                HOW SMARTPLATE WORKS
              </span>


              <h2>
                From kitchen leftovers
                to a proper meal.
              </h2>

            </div>


            <div className="feature-grid">

              <div className="feature-card">

                <span className="feature-number">
                  01
                </span>


                <div className="feature-icon">
                  🥔
                </div>


                <h3>
                  Add ingredients
                </h3>


                <p>
                  Type what's available
                  or simply speak it.
                </p>

              </div>


              <div className="feature-card">

                <span className="feature-number">
                  02
                </span>


                <div className="feature-icon">
                  ✨
                </div>


                <h3>
                  AI creates your recipe
                </h3>


                <p>
                  Get a practical Indian
                  home-style dish.
                </p>

              </div>


              <div className="feature-card">

                <span className="feature-number">
                  03
                </span>


                <div className="feature-icon">
                  🎧
                </div>


                <h3>
                  Listen while cooking
                </h3>


                <p>
                  Hear each cooking step
                  without reading.
                </p>

              </div>


              <div className="feature-card">

                <span className="feature-number">
                  04
                </span>


                <div className="feature-icon">
                  🎬
                </div>


                <h3>
                  Watch the recipe
                </h3>


                <p>
                  Generate an AI cooking
                  demonstration when needed.
                </p>

              </div>

            </div>

          </div>

        </section>

      </main>


      <footer className="site-footer">

        <div className="container footer-inner">

          <p>
            © 2026 SmartPlate AI
          </p>


          <p>
            Cook smarter. Waste less.
          </p>

        </div>

      </footer>

    </>
  );
}


/* =========================================================
   RECIPE PAGE
========================================================= */

function RecipePage({
  recipe,
  onBack,
  onAnotherRecipe,
}) {

  const originalServings =
    Number(
      recipe?.servings
    ) || 2;


  const [servings, setServings] =
    useState(
      originalServings
    );


  const [currentStep, setCurrentStep] =
    useState(0);


  const [completedSteps, setCompletedSteps] =
    useState([]);


  const [speaking, setSpeaking] =
    useState(false);


  const [videoLoading, setVideoLoading] =
    useState(false);


  const [videoUrl, setVideoUrl] =
    useState("");


  const [videoError, setVideoError] =
    useState("");


  const [saved, setSaved] =
    useState(false);


  const [anotherLoading, setAnotherLoading] =
    useState(false);


  const foodImage =
    useMemo(
      () =>
        getFoodImage(recipe),
      [recipe]
    );


  /* =======================================================
     RESET WHEN NEW RECIPE ARRIVES
  ======================================================= */

  useEffect(() => {

    setServings(
      Number(
        recipe?.servings
      ) || 2
    );


    setCurrentStep(0);


    setCompletedSteps([]);


    setVideoUrl("");


    setVideoError("");


    setSpeaking(false);


    try {

      const stored =
        localStorage.getItem(
          "smartplate-saved-recipes"
        );

      const savedList =
        stored
          ? JSON.parse(stored)
          : [];

      setSaved(
        Array.isArray(savedList) &&
          savedList.some(
            (item) =>
              item?.name === recipe?.name
          )
      );

    } catch {

      setSaved(false);

    }

  }, [recipe]);


  /* =======================================================
     SERVING-SCALED INGREDIENTS
  ======================================================= */

  const scaledIngredients =
    useMemo(() => {

      return (
        recipe?.ingredients ||
        []
      ).map((item) => ({

        ...item,

        quantity:
          scaleQuantity(
            item.quantity,
            originalServings,
            servings
          ),

      }));

    }, [
      recipe,
      originalServings,
      servings,
    ]);


  /* =======================================================
     PROGRESS
  ======================================================= */

  const totalSteps =
    recipe?.steps?.length || 0;


  const completedCount =
    completedSteps.length;


  const progress =
    totalSteps === 0
      ? 0
      : Math.round(
          (completedCount /
            totalSteps) *
            100
        );


  /* =======================================================
     TEXT TO SPEECH
  ======================================================= */

  const speakText =
    (text) => {

      if (
        !(
          "speechSynthesis"
          in window
        )
      ) {

        alert(
          "Text-to-speech is not supported in this browser."
        );

        return;

      }


      window.speechSynthesis.cancel();


      const utterance =
        new SpeechSynthesisUtterance(
          text
        );


      utterance.lang =
        "en-IN";


      utterance.rate =
        0.9;


      utterance.pitch =
        1;


      utterance.onstart =
        () => {

          setSpeaking(true);

        };


      utterance.onend =
        () => {

          setSpeaking(false);

        };


      utterance.onerror =
        () => {

          setSpeaking(false);

        };


      window.speechSynthesis.speak(
        utterance
      );

    };


  const pauseSpeech =
    () => {

      if (
        window.speechSynthesis
          .speaking
      ) {

        window.speechSynthesis.pause();

      }

    };


  const resumeSpeech =
    () => {

      if (
        window.speechSynthesis
          .paused
      ) {

        window.speechSynthesis.resume();

      }

    };


  const stopSpeech =
    () => {

      window.speechSynthesis.cancel();

      setSpeaking(false);

    };


  useEffect(() => {

    return () => {

      window.speechSynthesis.cancel();

    };

  }, []);


  /* =======================================================
     READ CURRENT STEP
  ======================================================= */

  const readCurrentStep =
    () => {

      const step =
        recipe?.steps?.[
          currentStep
        ];


      if (!step) {
        return;
      }


      speakText(
        `Step ${
          currentStep + 1
        }. ${
          step.instruction
        }`
      );

    };


  /* =======================================================
     MARK STEP COMPLETE
  ======================================================= */

  const markStepComplete =
    (index) => {

      setCompletedSteps(
        (previous) => {

          if (
            previous.includes(
              index
            )
          ) {

            return previous;

          }


          return [
            ...previous,
            index,
          ].sort(
            (a, b) =>
              a - b
          );

        }
      );

    };


  /* =======================================================
     SELECT STEP
  ======================================================= */

  const selectStep =
    (index) => {

      stopSpeech();

      setCurrentStep(
        index
      );

    };


  /* =======================================================
     PREVIOUS
  ======================================================= */

  const goPrevious =
    () => {

      stopSpeech();


      setCurrentStep(
        (previous) =>
          Math.max(
            0,
            previous - 1
          )
      );

    };


  /* =======================================================
     NEXT / COMPLETE
  ======================================================= */

  const goNext =
    () => {

      stopSpeech();


      markStepComplete(
        currentStep
      );


      if (
        currentStep <
        totalSteps - 1
      ) {

        setCurrentStep(
          (previous) =>
            Math.min(
              totalSteps - 1,
              previous + 1
            )
        );

      }

    };


  /* =======================================================
     SERVINGS + / -
  ======================================================= */

  const increaseServings =
    () => {

      setServings(
        (previous) =>
          Math.min(
            20,
            previous + 1
          )
      );

    };


  const decreaseServings =
    () => {

      setServings(
        (previous) =>
          Math.max(
            1,
            previous - 1
          )
      );

    };


  /* =======================================================
     SAVE RECIPE
  ======================================================= */

  const saveRecipe =
    () => {

      try {

        /*
          Save the original recipe,
          not the scaled display quantities.
          This means the saved recipe can
          still be adjusted later.
        */

        const stored =
          localStorage.getItem(
            "smartplate-saved-recipes"
          );

        let savedList = [];

        try {
          const parsed =
            stored
              ? JSON.parse(stored)
              : [];

          savedList =
            Array.isArray(parsed)
              ? parsed
              : [];
        } catch {
          savedList = [];
        }

        // Avoid duplicates. If the same recipe is saved again,
        // replace the old copy instead of creating duplicates.
        const updatedList = [
          ...savedList.filter(
            (item) =>
              item?.name !== recipe?.name
          ),
          recipe,
        ];

        localStorage.setItem(
          "smartplate-saved-recipes",
          JSON.stringify(
            updatedList
          )
        );

        // Remove the old single-recipe key if it still exists.
        localStorage.removeItem(
          "smartplate-saved-recipe"
        );

        setSaved(true);


        window.dispatchEvent(
          new Event(
            "smartplate-recipe-saved"
          )
        );


      } catch (error) {

        console.error(
          "Save recipe error:",
          error
        );

      }

    };


  /* =======================================================
     REMOVE SAVED RECIPE
  ======================================================= */

  const removeSavedRecipe =
    () => {

      try {
        const stored =
          localStorage.getItem(
            "smartplate-saved-recipes"
          );

        const savedList =
          stored
            ? JSON.parse(stored)
            : [];

        const updatedList =
          Array.isArray(savedList)
            ? savedList.filter(
                (item) =>
                  item?.name !==
                  recipe?.name
              )
            : [];

        localStorage.setItem(
          "smartplate-saved-recipes",
          JSON.stringify(
            updatedList
          )
        );

        localStorage.removeItem(
          "smartplate-saved-recipe"
        );

      } catch (error) {
        console.error(
          "Remove saved recipe error:",
          error
        );
      }

      setSaved(false);


      window.dispatchEvent(
        new Event(
          "smartplate-recipe-saved"
        )
      );

    };


  /* =======================================================
     GENERATE VIDEO
  ======================================================= */

  const generateVideo =
    async () => {

      if (!recipe) {
        return;
      }


      setVideoLoading(
        true
      );


      setVideoError(
        ""
      );


      setVideoUrl(
        ""
      );


      try {

        const response =
          await fetch(
            `${API_BASE}/api/generate-video`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                recipe,
              }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data?.error ||
              "Unable to generate video."
          );

        }


        if (
          !data.videoUrl
        ) {

          throw new Error(
            "Video was generated but no video URL was returned."
          );

        }


        setVideoUrl(
          data.videoUrl
        );


      } catch (error) {

        console.error(
          "Video generation error:",
          error
        );


        setVideoError(
          error?.message ||
            "Unable to generate the recipe video."
        );


      } finally {

        setVideoLoading(
          false
        );

      }

    };


  return (

    <div className="recipe-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="recipe-header">

        <div className="container recipe-nav">

          <button
            className="back-link"
            onClick={onBack}
            type="button"
          >
            ← Back to ingredients
          </button>


          <div className="brand">

            <div className="brand-mark">
              🍽️
            </div>

            SmartPlate <b>AI</b>

          </div>


          <button
            className={`save-button ${
              saved
                ? "saved"
                : ""
            }`}
            onClick={
              saved
                ? removeSavedRecipe
                : saveRecipe
            }
            type="button"
          >
            {saved
              ? "✓ Saved"
              : "♡ Save recipe"}
          </button>

        </div>

      </header>


      <main>


        {/* =================================================
            RECIPE HERO
        ================================================= */}

        <section className="recipe-hero">

          <div className="container recipe-hero-grid">

            <div className="recipe-title-area">

              <span className="recipe-badge">
                ✦ AI-GENERATED RECIPE
              </span>


              <h1>
                {recipe.name}
              </h1>


              <p className="recipe-description">
                {recipe.description}
              </p>


              <div className="recipe-stats">

                <div className="stat">

                  <span>
                    ⏱️
                  </span>


                  <div>

                    <small>
                      TIME
                    </small>


                    <strong>
                      {
                        recipe.timeMinutes ||
                        20
                      }{" "}
                      min
                    </strong>

                  </div>

                </div>


                {/* SERVINGS */}

                <div className="stat">

                  <span>
                    👥
                  </span>


                  <div>

                    <small>
                      SERVINGS
                    </small>


                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "8px",
                        marginTop:
                          "4px",
                      }}
                    >

                      <button
                        type="button"
                        onClick={
                          decreaseServings
                        }
                        disabled={
                          servings <=
                          1
                        }
                        style={{
                          width:
                            "28px",
                          height:
                            "28px",
                          border:
                            "1px solid #d6dfd9",
                          borderRadius:
                            "8px",
                          background:
                            "white",
                          color:
                            "#315c48",
                          fontSize:
                            "18px",
                          lineHeight:
                            "1",
                          cursor:
                            servings <=
                            1
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            servings <=
                            1
                              ? 0.45
                              : 1,
                        }}
                      >
                        −
                      </button>


                      <strong
                        style={{
                          minWidth:
                            "24px",
                          textAlign:
                            "center",
                        }}
                      >
                        {servings}
                      </strong>


                      <button
                        type="button"
                        onClick={
                          increaseServings
                        }
                        disabled={
                          servings >=
                          20
                        }
                        style={{
                          width:
                            "28px",
                          height:
                            "28px",
                          border:
                            "1px solid #d6dfd9",
                          borderRadius:
                            "8px",
                          background:
                            "white",
                          color:
                            "#315c48",
                          fontSize:
                            "18px",
                          lineHeight:
                            "1",
                          cursor:
                            servings >=
                            20
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            servings >=
                            20
                              ? 0.45
                              : 1,
                        }}
                      >
                        +
                      </button>

                    </div>

                  </div>

                </div>


                <div className="stat">

                  <span>
                    ⭐
                  </span>


                  <div>

                    <small>
                      LEVEL
                    </small>


                    <strong>
                      {
                        recipe.difficulty ||
                        "Easy"
                      }
                    </strong>

                  </div>

                </div>

              </div>


              {/* SERVING INFO */}

              <div
                style={{
                  marginTop:
                    "12px",
                  fontSize:
                    "11px",
                  color:
                    "#718078",
                }}
              >
                Ingredients automatically
                adjust for{" "}
                <strong>
                  {servings}
                </strong>{" "}
                servings.
              </div>

            </div>


            {/* DISH IMAGE */}

            <div className="recipe-visual">

              <div className="food-photo-card">

                <img
                  className="recipe-food-image"
                  src={foodImage}
                  alt={recipe.name}
                  onError={(
                    event
                  ) => {

                    event.currentTarget.src =
                      FOOD_IMAGES.indian;

                  }}
                />


                <div className="food-photo-overlay">

                  <span>
                    🍛
                  </span>


                  <div>

                    <strong>
                      Indian home-style
                    </strong>


                    <small>
                      Made for everyday kitchens
                    </small>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        <div className="container recipe-content">


          {/* =================================================
              INGREDIENTS
          ================================================= */}

          <section className="content-section">

            <div className="section-heading-row">

              <div className="section-index">
                01
              </div>


              <div>

                <h2>
                  Ingredients
                </h2>


                <p>
                  Everything you'll need
                </p>

              </div>

            </div>


            <div className="ingredients-grid">

              {scaledIngredients.map(
                (item, index) => (

                  <div
                    className="ingredient-card"
                    key={index}
                  >

                    <div className="ingredient-tick">
                      ✓
                    </div>


                    <div className="ingredient-details">

                      <strong>
                        {item.name}
                      </strong>


                      <span>
                        {item.quantity}
                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>


          {/* =================================================
              COOKING
          ================================================= */}

          <section className="content-section">

            <div className="section-heading-row">

              <div className="section-index">
                02
              </div>


              <div>

                <h2>
                  Let's cook
                </h2>


                <p>
                  Follow along one simple
                  step at a time
                </p>

              </div>

            </div>


            {/* =================================================
                PROGRESS
            ================================================= */}

            <div
              style={{
                marginBottom:
                  "25px",
                padding:
                  "20px 22px",
                border:
                  "1px solid #dce3de",
                borderRadius:
                  "18px",
                background:
                  "#ffffff",
              }}
            >

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap:
                    "15px",
                  marginBottom:
                    "12px",
                }}
              >

                <div>

                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#244d3b",
                      fontSize:
                        "14px",
                    }}
                  >
                    Cooking progress
                  </strong>


                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "4px",
                      color:
                        "#6c7f77",
                      fontSize:
                        "12px",
                    }}
                  >
                    Step{" "}
                    {Math.min(
                      currentStep +
                        1,
                      totalSteps
                    )}{" "}
                    of{" "}
                    {totalSteps}
                  </span>

                </div>


                <strong
                  style={{
                    color:
                      "#315c48",
                    fontSize:
                      "17px",
                  }}
                >
                  {progress}%
                </strong>

              </div>


              <div
                style={{
                  width:
                    "100%",
                  height:
                    "9px",
                  overflow:
                    "hidden",
                  borderRadius:
                    "999px",
                  background:
                    "#e8eee9",
                }}
              >

                <div
                  style={{
                    width:
                      `${progress}%`,
                    height:
                      "100%",
                    borderRadius:
                      "999px",
                    background:
                      "#315c48",
                    transition:
                      "width 0.3s ease",
                  }}
                />

              </div>


              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  marginTop:
                    "10px",
                  color:
                    "#87958f",
                  fontSize:
                    "10px",
                }}
              >

                <span>
                  {completedCount} completed
                </span>


                <span>
                  {Math.max(
                    totalSteps -
                      completedCount,
                    0
                  )}{" "}
                  remaining
                </span>

              </div>

            </div>


            {/* =================================================
                LISTEN BAR
            ================================================= */}

            <div className="audio-bar">

              <div className="audio-info">

                <div className="audio-icon">
                  🎧
                </div>


                <div>

                  <strong>
                    Listen & Cook
                  </strong>


                  <span>
                    Hear the instructions
                    while your hands are
                    busy cooking.
                  </span>

                </div>

              </div>


              <div className="audio-actions">

                <button
                  className="audio-primary"
                  onClick={
                    speaking
                      ? pauseSpeech
                      : readCurrentStep
                  }
                  type="button"
                >
                  {speaking
                    ? "⏸ Pause"
                    : "▶ Start"}
                </button>


                <button
                  className="audio-secondary"
                  onClick={
                    resumeSpeech
                  }
                  type="button"
                >
                  ▶ Resume
                </button>


                <button
                  className="audio-secondary"
                  onClick={
                    stopSpeech
                  }
                  type="button"
                >
                  ■ Stop
                </button>

              </div>

            </div>


            {/* =================================================
                STEP NUMBERS
            ================================================= */}

            <div className="step-selector">

              {(recipe.steps || [])
                .map(
                  (
                    step,
                    index
                  ) => (

                    <button
                      key={index}
                      className={`step-dot ${
                        currentStep ===
                        index
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        selectStep(
                          index
                        )
                      }
                      type="button"
                      style={{
                        position:
                          "relative",
                      }}
                    >

                      {completedSteps.includes(
                        index
                      )
                        ? "✓"
                        : index + 1}

                    </button>

                  )
                )}

            </div>


            {/* =================================================
                CURRENT STEP
            ================================================= */}

            {recipe.steps?.length >
              0 && (

              <div className="active-step">

                <div className="step-top">

                  <span>
                    STEP{" "}
                    {currentStep +
                      1}
                    {" / "}
                    {totalSteps}
                  </span>


                  {speaking && (

                    <span className="reading-status">
                      🔊 Reading...
                    </span>

                  )}

                </div>


                <h3>
                  {
                    recipe.steps[
                      currentStep
                    ].instruction
                  }
                </h3>


                <div className="step-actions">

                  <button
                    className="read-button"
                    onClick={
                      readCurrentStep
                    }
                    type="button"
                  >
                    🔊 Read this step
                  </button>


                  <div className="step-navigation">

                    <button
                      onClick={
                        goPrevious
                      }
                      disabled={
                        currentStep ===
                        0
                      }
                      type="button"
                    >
                      ← Previous
                    </button>


                    <button
                      className="next-step"
                      onClick={
                        goNext
                      }
                      disabled={
                        currentStep ===
                          totalSteps -
                            1 &&
                        completedSteps.includes(
                          currentStep
                        )
                      }
                      type="button"
                    >
                      {currentStep ===
                        totalSteps -
                          1

                        ? completedSteps.includes(
                            currentStep
                          )
                          ? "✓ Completed"
                          : "Finish Step ✓"

                        : "Done & Next →"}

                    </button>

                  </div>

                </div>

              </div>

            )}

          </section>


          {/* =================================================
              AI VIDEO
          ================================================= */}

          <section className="content-section video-section">

            <div className="section-heading-row">

              <div className="section-index">
                03
              </div>


              <div>

                <h2>
                  Watch the recipe
                </h2>


                <p>
                  See the cooking process
                  visually, step by step.
                </p>

              </div>

            </div>


            <div className="video-card">


              {!videoUrl &&
                !videoLoading &&
                !videoError && (

                  <div className="video-empty">

                    <div className="video-icon">
                      🎬
                    </div>


                    <div className="video-copy">

                      <h3>
                        AI Cooking Video
                      </h3>


                      <p>
                        Generate a short visual
                        demonstration of this
                        recipe using AI.
                      </p>


                      <button
                        className="video-generate-button"
                        onClick={
                          generateVideo
                        }
                        type="button"
                      >
                        ▶ Generate Cooking Video
                      </button>


                      <small className="video-billing-note">
                        AI video generation uses
                        the configured Gemini/Veo
                        API and may incur API
                        usage charges.
                      </small>

                    </div>

                  </div>

                )}


              {videoLoading && (

                <div className="video-loading">

                  <div className="video-spinner">
                    ✦
                  </div>


                  <h3>
                    Creating your cooking video...
                  </h3>


                  <p>
                    Veo is generating the
                    visual cooking demonstration.
                  </p>


                  <small>
                    This may take a little while.
                    Please keep this page open.
                  </small>

                </div>

              )}


              {videoError && (

                <div className="video-error">

                  <div className="video-error-icon">
                    ⚠️
                  </div>


                  <div>

                    <h3>
                      AI Cooking Video
                    </h3>


                    <p>
                      Video generation is currently
                      unavailable in the demo
                      environment because the AI
                      video API quota has been reached.
                    </p>


                    <small className="video-error-note">
                      Your recipe and cooking
                      instructions are fully available.
                      AI video generation can be enabled
                      when the Veo API quota is available.
                    </small>


                    <button
                      className="video-generate-button"
                      onClick={
                        generateVideo
                      }
                      type="button"
                    >
                      Try Again
                    </button>

                  </div>

                </div>

              )}


              {videoUrl && (

                <div className="video-player-wrapper">

                  <video
                    className="recipe-video"
                    controls
                    playsInline
                    preload="metadata"
                  >

                    <source
                      src={videoUrl}
                      type="video/mp4"
                    />

                    Your browser does not
                    support video playback.

                  </video>


                  <div className="video-success-row">

                    <div>

                      <strong>
                        ✓ Cooking video ready
                      </strong>


                      <span>
                        Use the controls above
                        to play, pause and seek.
                      </span>

                    </div>


                    <button
                      className="video-regenerate-button"
                      onClick={
                        generateVideo
                      }
                      type="button"
                    >
                      ↻ Generate Again
                    </button>

                  </div>

                </div>

              )}

            </div>

          </section>


          {/* =================================================
              SMART SWAPS
          ================================================= */}

          <section className="content-section">

            <div className="section-heading-row">

              <div className="section-index">
                04
              </div>


              <div>

                <h2>
                  Smart swaps
                </h2>


                <p>
                  Don't have something?
                  Try these alternatives.
                </p>

              </div>

            </div>


            <div className="swaps-grid">

              {(recipe.swaps || [])
                .slice(0, 5)
                .map(
                  (
                    swap,
                    index
                  ) => (

                    <div
                      className="swap-card"
                      key={index}
                    >

                      <div className="swap-side">

                        <small>
                          INSTEAD OF
                        </small>


                        <strong>
                          {
                            swap.ingredient
                          }
                        </strong>

                      </div>


                      <div className="swap-arrow">
                        →
                      </div>


                      <div className="swap-side">

                        <small>
                          TRY
                        </small>


                        <strong>
                          {Array.isArray(
                            swap.suggestions
                          )
                            ? swap.suggestions.join(
                                " or "
                              )
                            : swap.suggestions}
                        </strong>

                      </div>

                    </div>

                  )
                )}

            </div>

          </section>


          {/* =================================================
              ANOTHER RECIPE
          ================================================= */}

          <div className="another-recipe">

            <div className="another-icon">
              ♻️
            </div>


            <div className="another-copy">

              <strong>
                Still have ingredients left?
              </strong>


              <span>
                Let SmartPlate find another
                Indian home-style idea using
                them.
              </span>

            </div>


            <button
              className="another-button"
              onClick={
                async () => {

                  if (
                    anotherLoading
                  ) {
                    return;
                  }


                  setAnotherLoading(
                    true
                  );


                  try {

                    const ingredientList =
                      (
                        recipe.ingredients ||
                        []
                      )
                        .map(
                          (item) =>
                            item.name
                        )
                        .filter(Boolean)
                        .join(", ");


                    if (
                      !ingredientList.trim()
                    ) {

                      throw new Error(
                        "No ingredients were found."
                      );

                    }


                    const response =
                      await fetch(
                        `${API_BASE}/api/another-recipe`,
                        {
                          method:
                            "POST",

                          headers: {
                            "Content-Type":
                              "application/json",
                          },

                          body:
                            JSON.stringify({
                              ingredients:
                                ingredientList,
                            }),
                        }
                      );


                    const data =
                      await response.json();


                    if (
                      !response.ok
                    ) {

                      throw new Error(
                        data?.error ||
                          "Unable to generate another recipe."
                      );

                    }


                    if (
                      !data ||
                      !data.name
                    ) {

                      throw new Error(
                        "The AI did not return a valid recipe."
                      );

                    }


                    onAnotherRecipe(
                      data
                    );


                  } catch (
                    error
                  ) {

                    console.error(
                      "Another recipe error:",
                      error
                    );


                    alert(
                      error?.message ||
                        "Unable to generate another recipe right now."
                    );


                  } finally {

                    setAnotherLoading(
                      false
                    );

                  }

                }
              }
              disabled={
                anotherLoading
              }
              type="button"
            >

              {anotherLoading
                ? "Creating..."
                : "Find another recipe →"}

            </button>

          </div>

        </div>

      </main>


      <footer className="site-footer">

        <div className="container footer-inner">

          <p>
            © 2026 SmartPlate AI
          </p>


          <p>
            Cook smarter. Waste less.
          </p>

        </div>

      </footer>

    </div>
  );
}


/* =========================================================
   MAIN APP
========================================================= */

export default function App() {

  const [recipe, setRecipe] =
    useState(null);


  /* =======================================================
     FIRST RECIPE
  ======================================================= */

  const handleRecipeGenerated =
    (generatedRecipe) => {

      setRecipe(
        generatedRecipe
      );


      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    };


  /* =======================================================
     BACK TO HOME
  ======================================================= */

  const handleBack =
    () => {

      setRecipe(null);


      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    };


  /* =======================================================
     ANOTHER RECIPE
  ======================================================= */

  const handleAnotherRecipe =
    (newRecipe) => {

      setRecipe(
        newRecipe
      );


      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    };


  /* =======================================================
     RECIPE PAGE
  ======================================================= */

  if (recipe) {

    return (

      <RecipePage
        recipe={recipe}
        onBack={handleBack}
        onAnotherRecipe={
          handleAnotherRecipe
        }
      />

    );

  }


  /* =======================================================
     HOME PAGE
  ======================================================= */

  return (

    <HomePage
      onRecipeGenerated={
        handleRecipeGenerated
      }
    />

  );

}